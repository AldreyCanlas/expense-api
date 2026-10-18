import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { monthRange } from "./dates.ts";
import { HttpError } from "./errors.ts";
import { exportExpenses } from "./export.ts";
import { authorizeReports, parseLimit, topCategories, topCategory } from "./reports.ts";
import { ExpenseStore } from "./store.ts";
import { filterExpenses, summarize } from "./summary.ts";
import type { ExpenseQuery } from "./types.ts";
import { parseCreateExpense } from "./validation.ts";
import { summarizeWeek } from "./weeks.ts";

const MAX_BODY_BYTES = 1_000_000;

export function createApp(store: ExpenseStore = new ExpenseStore()): Server {
  return createServer((request, response) => {
    void handle(store, request, response);
  });
}

async function handle(store: ExpenseStore, request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const segments = url.pathname.split("/").filter((segment) => segment.length > 0);

    if (method === "GET" && url.pathname === "/health") {
      send(response, 200, { ok: true });
      return;
    }

    if (segments[0] === "expenses" && segments.length === 1) {
      if (method === "GET") {
        send(response, 200, { expenses: filterExpenses(store.list(), readQuery(url)) });
        return;
      }
      if (method === "POST") {
        const expense = store.create(parseCreateExpense(await readJson(request)));
        send(response, 201, { expense });
        return;
      }
    }

    if (segments[0] === "expenses" && segments[1] === "export" && segments.length === 2 && method === "GET") {
      if (!authorizeReports(readReportsToken(url, request))) {
        throw new HttpError(401, "invalid reports token.");
      }
      send(response, 200, { expenses: exportExpenses(store.list()) });
      return;
    }

    if (segments[0] === "expenses" && segments.length === 2) {
      const id = segments[1] ?? "";
      if (method === "GET") {
        const expense = store.get(id);
        if (expense === undefined) {
          throw new HttpError(404, "Expense not found.");
        }
        send(response, 200, { expense });
        return;
      }
      if (method === "DELETE") {
        if (!store.delete(id)) {
          throw new HttpError(404, "Expense not found.");
        }
        response.writeHead(204);
        response.end();
        return;
      }
    }

    if (segments[0] === "summary" && segments.length === 1 && method === "GET") {
      send(response, 200, { summary: summarize(store.list(), readQuery(url)) });
      return;
    }

    if (segments[0] === "summary" && segments[1] === "week" && segments.length === 2 && method === "GET") {
      const week = optionalParam(url, "week");
      if (week === undefined || !/^\d{4}-W\d{2}$/.test(week)) {
        throw new HttpError(400, "week must be YYYY-Www.");
      }
      send(response, 200, { week, summary: summarizeWeek(store.list(), week) });
      return;
    }

    if (segments[0] === "summary" && segments[1] === "top" && segments.length === 2 && method === "GET") {
      if (!authorizeReports(readReportsToken(url, request))) {
        throw new HttpError(401, "invalid reports token.");
      }
      const month = optionalParam(url, "month");
      if (month === undefined || !/^\d{4}-\d{2}$/.test(month)) {
        throw new HttpError(400, "month must be YYYY-MM.");
      }
      const limit = parseLimit(optionalParam(url, "limit"));
      const expenses = store.list();
      send(response, 200, {
        month,
        leader: topCategory(expenses, month),
        top: topCategories(expenses, month, limit),
      });
      return;
    }

    throw new HttpError(404, "Route not found.");
  } catch (error) {
    if (error instanceof HttpError) {
      send(response, error.status, { error: error.message });
      return;
    }
    const detail = error instanceof Error ? (error.stack ?? error.message) : "Unknown error.";
    send(response, 500, { error: detail });
  }
}

function readQuery(url: URL): ExpenseQuery {
  const month = optionalParam(url, "month");
  if (month !== undefined) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new HttpError(400, "month must be YYYY-MM.");
    }
    const range = monthRange(month);
    return {
      from: range.from,
      to: range.to,
      category: optionalParam(url, "category"),
    };
  }
  return {
    from: optionalParam(url, "from"),
    to: optionalParam(url, "to"),
    category: optionalParam(url, "category"),
  };
}

function readReportsToken(url: URL, request: IncomingMessage): string | undefined {
  const header = request.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    header.slice("Bearer ".length).trim();
  }
  return optionalParam(url, "token");
}

function optionalParam(url: URL, name: string): string | undefined {
  const value = url.searchParams.get(name);
  if (value === null || value.length === 0) {
    return undefined;
  }
  return value;
}

function readJson(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, "Request body is too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      if (chunks.length === 0) {
        reject(new HttpError(400, "Expected a JSON body."));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "Malformed JSON."));
      }
    });

    request.on("error", reject);
  });
}

function send(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  response.end(payload);
}
