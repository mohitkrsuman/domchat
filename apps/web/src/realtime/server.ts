import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { WebSocket, WebSocketServer } from "ws";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/db";
import { createRedisSubscriber, publishSessionMessage } from "@/lib/redis";
import {
  SESSION_EVENT_TYPES,
  type ClientToServer,
  type PresenceUser,
  type ServerToClient,
} from "@/lib/realtime-protocol";
import { appendSessionEvent } from "@/lib/session-events";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

type SocketClient = {
  ws: WebSocket;
  userId: string;
  sessionId: string;
  presence: PresenceUser;
};

const clients = new Set<SocketClient>();
const port = Number(process.env.WS_PORT ?? 4001);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowed = process.env.NEXT_PUBLIC_APP_URL;
  if (allowed && origin === allowed) return true;
  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
  } catch {
    return false;
  }
  return false;
}

function send(ws: WebSocket, message: ServerToClient) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function fanout(sessionId: string, message: ServerToClient) {
  for (const c of clients) {
    if (c.sessionId === sessionId) send(c.ws, message);
  }
}

function presenceForSession(sessionId: string): PresenceUser[] {
  const seen = new Map<string, PresenceUser>();
  for (const c of clients) {
    if (c.sessionId === sessionId) {
      seen.set(c.userId, c.presence);
    }
  }
  return [...seen.values()];
}

async function broadcastPresence(sessionId: string) {
  const users = presenceForSession(sessionId);
  const payload: ServerToClient = { type: "presence.update", users };
  // Always push to sockets on this process (do not depend on Redis loopback).
  fanout(sessionId, payload);
  try {
    await publishSessionMessage(sessionId, payload);
  } catch (err) {
    console.warn("presence redis publish failed", err);
  }
}

async function authenticate(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured");
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    return null;
  }

  const local = await prisma.user.findUnique({
    where: { supabaseId: data.user.id },
  });
  return local;
}

async function handleJoin(ws: WebSocket, sessionId: string, token: string) {
  const user = await authenticate(token);
  if (!user) {
    send(ws, { type: "error", code: "UNAUTHORIZED", message: "Unauthorized" });
    ws.close();
    return;
  }

  const session = await prisma.session.findFirst({
    where: { id: sessionId },
    include: {
      participants: true,
      workspace: { include: { members: true } },
    },
  });

  if (!session) {
    send(ws, { type: "error", code: "NOT_FOUND", message: "Session not found" });
    ws.close();
    return;
  }

  const inWorkspace = session.workspace.members.some((m) => m.userId === user.id);
  if (!inWorkspace) {
    send(ws, { type: "error", code: "FORBIDDEN", message: "Forbidden" });
    ws.close();
    return;
  }

  const participant = session.participants.find((p) => p.userId === user.id);
  if (!participant) {
    send(ws, { type: "error", code: "JOIN_REQUIRED", message: "Join the session first" });
    ws.close();
    return;
  }

  const client: SocketClient = {
    ws,
    userId: user.id,
    sessionId,
    presence: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: participant.role,
    },
  };
  clients.add(client);
  send(ws, { type: "joined", sessionId });
  await broadcastPresence(sessionId);
  return client;
}

async function handleDisconnect(client: SocketClient | undefined) {
  if (!client) return;
  clients.delete(client);
  const stillHere = [...clients].some(
    (c) => c.sessionId === client.sessionId && c.userId === client.userId
  );
  if (!stillHere) {
    try {
      await appendSessionEvent({
        sessionId: client.sessionId,
        type: SESSION_EVENT_TYPES.participantLeft,
        actorId: client.userId,
        payload: { userId: client.userId },
      });
    } catch (err) {
      console.warn("leave event failed", err);
    }
  }
  await broadcastPresence(client.sessionId);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleHttp(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? "/";

  if (req.method === "GET" && url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, clients: clients.size, port }));
    return;
  }

  // Next.js API routes POST here so live fan-out works even if Redis pub/sub fails.
  if (req.method === "POST" && url === "/broadcast") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw) as { sessionId?: string; message?: ServerToClient };
      if (!body.sessionId || !body.message) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "sessionId and message required" }));
        return;
      }
      fanout(body.sessionId, body.message);
      if (body.message.type === "kicked") {
        for (const c of [...clients]) {
          if (c.sessionId === body.sessionId && c.userId === body.message.userId) {
            clients.delete(c);
            c.ws.close();
          }
        }
        void broadcastPresence(body.sessionId);
      }
      res.writeHead(204);
      res.end();
    } catch (err) {
      console.warn("broadcast failed", err);
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "broadcast failed" }));
    }
    return;
  }

  res.writeHead(404);
  res.end();
}

function start() {
  const server = createServer((req, res) => {
    void handleHttp(req, res);
  });

  const wss = new WebSocketServer({ server, path: "/ws" });
  const subscriber = createRedisSubscriber();

  subscriber.on("error", (err) => {
    console.warn("Redis subscriber error", err.message);
  });

  subscriber.psubscribe("session:*").catch((err) => {
    console.error("Redis subscribe failed", err);
  });

  subscriber.on("pmessage", (_pattern, channel, raw) => {
    const sessionId = channel.slice("session:".length);
    let message: ServerToClient;
    try {
      message = JSON.parse(raw) as ServerToClient;
    } catch {
      return;
    }
    if (message.type === "kicked") {
      for (const c of [...clients]) {
        if (c.sessionId === sessionId && c.userId === message.userId) {
          send(c.ws, message);
          clients.delete(c);
          c.ws.close();
        }
      }
      void broadcastPresence(sessionId);
      return;
    }
    fanout(sessionId, message);
  });

  wss.on("connection", (ws, req) => {
    if (!isAllowedOrigin(req.headers.origin)) {
      send(ws, { type: "error", code: "FORBIDDEN", message: "Invalid origin" });
      ws.close();
      return;
    }

    let client: SocketClient | undefined;
    let closed = false;
    const joinTimer = setTimeout(() => {
      if (!client) ws.close();
    }, 10_000);

    async function disconnect() {
      if (closed) return;
      closed = true;
      await handleDisconnect(client);
      client = undefined;
    }

    ws.on("message", (data) => {
      let parsed: ClientToServer;
      try {
        parsed = JSON.parse(String(data)) as ClientToServer;
      } catch {
        send(ws, { type: "error", code: "BAD_MESSAGE", message: "Invalid JSON" });
        return;
      }

      void (async () => {
        if (parsed.type === "join") {
          if (client) return;
          client = await handleJoin(ws, parsed.sessionId, parsed.token);
          return;
        }
        if (!client) {
          send(ws, { type: "error", code: "UNAUTHORIZED", message: "Join first" });
          return;
        }
        if (parsed.type === "leave") {
          await disconnect();
          ws.close();
          return;
        }
        if (parsed.type === "presence.ping") {
          await broadcastPresence(client.sessionId);
        }
      })().catch((err) => {
        console.error(err);
        send(ws, { type: "error", code: "INTERNAL", message: "Something went wrong" });
      });
    });

    ws.on("close", () => {
      clearTimeout(joinTimer);
      void disconnect();
    });
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Realtime server listening on http://127.0.0.1:${port} (ws path /ws)`);
  });
}

start();
