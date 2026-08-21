import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { publishSessionMessage } from "@/lib/redis";
import { asTimelineEvent, type TimelineEvent } from "@/lib/realtime-protocol";

const actorSelect = { id: true, email: true, name: true } as const;

function realtimeHttpBase() {
  const port = process.env.WS_PORT ?? "4001";
  return process.env.REALTIME_HTTP_URL ?? `http://127.0.0.1:${port}`;
}

async function publishRealtime(sessionId: string, message: unknown) {
  try {
    await publishSessionMessage(sessionId, message);
  } catch (err) {
    console.warn("Redis publish failed", err);
  }

  // Direct push to the WS process so live updates work even if Redis pub/sub is flaky.
  try {
    await fetch(`${realtimeHttpBase()}/broadcast`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, message }),
      signal: AbortSignal.timeout(1500),
    });
  } catch (err) {
    console.warn(
      "Realtime HTTP broadcast failed — is `npm run dev:realtime` (or `npm run dev`) running?",
      err instanceof Error ? err.message : err
    );
  }
}

export { publishRealtime };

export async function appendSessionEvent(input: {
  sessionId: string;
  type: string;
  actorId?: string | null;
  payload: Prisma.InputJsonValue;
}): Promise<TimelineEvent> {
  const created = await prisma.sessionEvent.create({
    data: {
      sessionId: input.sessionId,
      type: input.type,
      actorId: input.actorId ?? null,
      payload: input.payload,
    },
    include: { actor: { select: actorSelect } },
  });

  const event = asTimelineEvent(created);

  await publishRealtime(input.sessionId, { type: "event.append", event });

  return event;
}
