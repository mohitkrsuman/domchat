import { NextResponse } from "next/server";

async function checkTcp(host: string, port: number): Promise<boolean> {
  try {
    const net = await import("net");
    return new Promise((resolve) => {
      const socket = net.createConnection({ host, port }, () => {
        socket.end();
        resolve(true);
      });
      socket.on("error", () => resolve(false));
      socket.setTimeout(2000, () => {
        socket.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

export async function GET() {
  const postgresOk = await checkTcp("127.0.0.1", 5432);
  const redisOk = await checkTcp("127.0.0.1", 6379);

  return NextResponse.json({
    status: postgresOk && redisOk ? "ok" : "degraded",
    phase: "0",
    postgres: postgresOk ? "reachable" : "unreachable",
    redis: redisOk ? "reachable" : "unreachable",
  });
}
