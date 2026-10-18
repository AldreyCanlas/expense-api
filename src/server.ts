import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { errorBody, HttpError } from "./errors.ts";
import { ExpenseStore } from "./store.ts";
import { filterExpenses, summarize } from "./summary.ts";
import type { ExpenseQuery } from "./types.ts";
import { canonicalCategory, parseCreateExpense, parseOptionalDate } from "./validation.ts";

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
          throw new HttpError(404, "not_found", "Expense not found.");
        }
        send(response, 200, { expense });
        return;
      }
      if (method === "DELETE") {
        if (!store.delete(id)) {
          throw new HttpError(404, "not_found", "Expense not found.");
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

    throw new HttpError(404, "route_not_found", "Route not found.");
  } catch (error) {
    if (error instanceof HttpError) {
      send(response, error.status, errorBody(error));
      return;
    }
    console.error(error);
    send(response, 500, errorBody(new HttpError(500, "internal_error", "Unexpected error.")));
  }
}

function readQuery(url: URL): ExpenseQuery {
  const on = parseOptionalDate(optionalParam(url, "on"), "on");
  if (on !== undefined) {
    return { from: on, to: on, category: readCategory(url) };
  }
  return {
    from: parseOptionalDate(optionalParam(url, "from"), "from"),
    to: parseOptionalDate(optionalParam(url, "to"), "to"),
    category: readCategory(url),
  };
}

function readCategory(url: URL): string | undefined {
  const value = optionalParam(url, "category");
  if (value === undefined) {
    return undefined;
  }
  const category = canonicalCategory(value);
  return category.length === 0 ? undefined : category;
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
        reject(new HttpError(413, "body_too_large", "Request body is too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      if (chunks.length === 0) {
        reject(new HttpError(400, "invalid_body", "Expected a JSON body."));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "malformed_json", "Malformed JSON."));
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
