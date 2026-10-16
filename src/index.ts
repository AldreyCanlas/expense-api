import { createApp } from "./server.ts";

const port = readPort(process.env.PORT);
const server = createApp();

server.listen(port, () => {
  console.log(`expense-api listening on ${port}`);
});

function readPort(raw: string | undefined): number {
  if (raw === undefined || raw.length === 0) {
    return 3000;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${raw}`);
  }
  return port;
}
