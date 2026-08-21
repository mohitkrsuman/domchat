#!/usr/bin/env node
/**
 * Free WS_PORT (default 4001) before `npm run dev`.
 * Only kills LISTEN sockets — run once via predev, never from the long-lived server process.
 */
import { execSync } from "node:child_process";

const port = process.env.WS_PORT ?? "4001";

try {
  const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  if (!out) process.exit(0);
  for (const pid of out.split(/\n+/)) {
    try {
      process.kill(Number(pid), "SIGTERM");
    } catch {
      // already gone
    }
  }
  // Brief wait so the port is released before concurrently starts realtime.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
} catch {
  // nothing listening
}
