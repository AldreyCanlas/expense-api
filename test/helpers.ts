import type { AddressInfo } from "node:net";
import { createApp } from "../src/server.ts";
import { ExpenseStore } from "../src/store.ts";

export type TestApp = {
  url: string;
  close: () => Promise<void>;
};

export async function startTestApp(store = new ExpenseStore()): Promise<TestApp> {
  const server = createApp(store);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export async function request(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text.length === 0 ? null : (JSON.parse(text) as unknown),
  };
}
