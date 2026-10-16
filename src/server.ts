import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { budgetStatuses, parseBudget, requireMonth } from "./budgets.ts";
import { HttpError } from "./errors.ts";
import { ExpenseStore } from "./store.ts";
import { filterExpenses, summarize } from "./summary.ts";
import type { ExpenseQuery } from "./types.ts";
import { parseCreateExpense } from "./validation.ts";

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

    if (segments[0] === "budgets" && segments.length === 1) {
      if (method === "PUT") {
        const budget = store.setBudget(parseBudget(await readJson(request)));
        send(response, 200, { budget });
        return;
      }
      if (method === "GET") {
        const month = requireMonth(optionalParam(url, "month"));
        send(response, 200, { budgets: store.listBudgets(month) });
        return;
      }
    }

    if (segments[0] === "budgets" && segments[1] === "status" && segments.length === 2 && method === "GET") {
      const month = requireMonth(optionalParam(url, "month"));
      send(response, 200, {
        statuses: budgetStatuses(store.listBudgets(month), store.list(), month),
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
  return {
    from: optionalParam(url, "from"),
    to: optionalParam(url, "to"),
    category: optionalParam(url, "category"),
  };
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
