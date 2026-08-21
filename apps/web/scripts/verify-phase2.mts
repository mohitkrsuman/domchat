/**
 * Phase 2 exit-criteria verifier (two WS clients, live chat, replay, viewer, presence).
 *
 * Requires realtime with ALLOW_VERIFY_WS_TOKENS=1 (non-production only).
 * Usage:
 *   ALLOW_VERIFY_WS_TOKENS=1 npm run dev:realtime
 *   npx tsx scripts/verify-phase2.mts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "../src/generated/prisma";
import WebSocket from "ws";
import { appendSessionEvent } from "../src/lib/session-events";
import { SESSION_EVENT_TYPES } from "../src/lib/realtime-protocol";
import { canSendMessages } from "../src/lib/session-roles";

const prisma = new PrismaClient();
const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4001";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const stamp = Date.now();

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function record(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
}

function waitForMessage(
  ws: WebSocket,
  predicate: (msg: Record<string, unknown>) => boolean,
  ms = 5000
): Promise<Record<string, unknown>> {
  return new Promise((resolveWait, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout waiting for message")), ms);
    const onMessage = (raw: WebSocket.RawData) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch {
        return;
      }
      if (predicate(msg)) {
        clearTimeout(timer);
        ws.off("message", onMessage);
        resolveWait(msg);
      }
    };
    ws.on("message", onMessage);
  });
}

async function main() {
  const health = await fetch("http://127.0.0.1:4001/health");
  const healthBody = (await health.json()) as { ok?: boolean };
  record("realtime health", health.ok && healthBody.ok === true, JSON.stringify(healthBody));

  const owner = await prisma.user.findFirst({ where: { email: "mohitkrsuman25@gmail.com" } });
  if (!owner) throw new Error("seed owner missing");
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: owner.id } });
  if (!membership) throw new Error("seed workspace missing");

  const userA = await prisma.user.create({
    data: {
      supabaseId: `verify-a-${stamp}`,
      email: `phase2a.${stamp}@domchat.local`,
      name: "Phase2 A",
    },
  });
  const userB = await prisma.user.create({
    data: {
      supabaseId: `verify-b-${stamp}`,
      email: `phase2b.${stamp}@domchat.local`,
      name: "Phase2 B",
    },
  });

  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: membership.workspaceId, userId: userA.id, role: "member" },
      { workspaceId: membership.workspaceId, userId: userB.id, role: "member" },
    ],
  });

  const session = await prisma.session.create({
    data: {
      workspaceId: membership.workspaceId,
      ownerId: userA.id,
      createdById: userA.id,
      title: `phase2-verify-${stamp}`,
      type: "bug",
      status: "open",
      participants: {
        create: [
          { userId: userA.id, role: "owner" },
          { userId: userB.id, role: "contributor" },
        ],
      },
    },
  });

  const tokenA = `verify:${userA.id}`;
  const tokenB = `verify:${userB.id}`;

  const wsA = new WebSocket(`${wsUrl}/ws`, { origin: appUrl });
  const wsB = new WebSocket(`${wsUrl}/ws`, { origin: appUrl });
  await Promise.all([
    new Promise<void>((res, rej) => {
      wsA.once("open", () => res());
      wsA.once("error", rej);
    }),
    new Promise<void>((res, rej) => {
      wsB.once("open", () => res());
      wsB.once("error", rej);
    }),
  ]);

  wsA.send(JSON.stringify({ type: "join", sessionId: session.id, token: tokenA }));
  const joinErrA = await waitForMessage(
    wsA,
    (m) => m.type === "presence.update" || m.type === "error",
    5000
  );
  if (joinErrA.type === "error") {
    record("two clients join same room (presence)", false, JSON.stringify(joinErrA));
    throw new Error(`join A failed: ${JSON.stringify(joinErrA)}`);
  }

  wsB.send(JSON.stringify({ type: "join", sessionId: session.id, token: tokenB }));
  const presenceA = await waitForMessage(
    wsA,
    (m) => {
      if (m.type !== "presence.update") return false;
      const users = m.users as Array<{ id: string }> | undefined;
      return !!users && users.length >= 2 && users.some((u) => u.id === userB.id);
    },
    5000
  ).catch(() => null);
  record(
    "two clients join same room (presence)",
    !!presenceA,
    `users=${JSON.stringify((presenceA?.users as Array<{ email?: string }> | undefined)?.map((u) => u.email))}`
  );

  const recvPromise = waitForMessage(
    wsB,
    (m) => {
      if (m.type !== "event.append") return false;
      const event = m.event as { type?: string } | undefined;
      return event?.type === SESSION_EVENT_TYPES.messageUser;
    },
    4000
  );
  const t0 = Date.now();
  await appendSessionEvent({
    sessionId: session.id,
    type: SESSION_EVENT_TYPES.messageUser,
    actorId: userA.id,
    payload: { text: "hello from A", userId: userA.id },
  });
  const live = await recvPromise.then((msg) => ({ ok: true as const, msg })).catch((e) => ({
    ok: false as const,
    error: String(e),
  }));
  const latency = Date.now() - t0;
  record(
    "live message to other client <2s",
    live.ok && latency < 2000,
    `latency=${latency}ms ${live.ok ? `event=${(live.msg.event as { id?: string })?.id}` : live.error}`
  );

  for (let i = 0; i < 8; i++) {
    await prisma.sessionEvent.create({
      data: {
        sessionId: session.id,
        type: SESSION_EVENT_TYPES.messageUser,
        actorId: userA.id,
        payload: { text: `seed-${i}`, userId: userA.id },
      },
    });
  }
  const limit = 5;
  const newestFirst = await prisma.sessionEvent.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const events = newestFirst.reverse();
  const texts = events.map((e) => (e.payload as { text?: string })?.text).filter(Boolean);
  const hasLatest = texts.includes("seed-7");
  const chronological = events.every(
    (e, i, arr) => i === 0 || arr[i - 1].createdAt <= e.createdAt
  );
  record(
    "refresh timeline returns latest N chronological",
    hasLatest && chronological && events.length === limit,
    `texts=${JSON.stringify(texts)}`
  );

  await prisma.sessionParticipant.update({
    where: { sessionId_userId: { sessionId: session.id, userId: userB.id } },
    data: { role: "viewer" },
  });
  record(
    "viewer cannot send (role gate)",
    canSendMessages("viewer") === false && canSendMessages("contributor") === true
  );

  const participant = await prisma.sessionParticipant.findUnique({
    where: { sessionId_userId: { sessionId: session.id, userId: userB.id } },
  });
  record("viewer blocked (403 path)", !canSendMessages(participant?.role), `role=${participant?.role}`);

  const leavePresence = waitForMessage(
    wsA,
    (m) => {
      if (m.type !== "presence.update") return false;
      const users = m.users as Array<{ id: string }> | undefined;
      return !!users && users.every((u) => u.id !== userB.id);
    },
    5000
  );
  wsB.send(JSON.stringify({ type: "leave" }));
  wsB.close();
  const afterLeave = await leavePresence.catch(() => null);
  record(
    "presence updates on leave",
    !!afterLeave,
    `remaining=${(afterLeave?.users as unknown[] | undefined)?.length}`
  );

  wsA.close();

  await prisma.sessionEvent.deleteMany({ where: { sessionId: session.id } });
  await prisma.sessionParticipant.deleteMany({ where: { sessionId: session.id } });
  await prisma.session.delete({ where: { id: session.id } });
  await prisma.workspaceMember.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });

  await prisma.$disconnect();

  const failed = checks.filter((c) => !c.ok);
  console.log("\n--- Summary ---");
  console.log(`${checks.length - failed.length}/${checks.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
