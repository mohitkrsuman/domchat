import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { publishSessionMessage } from "@/lib/redis";
import { asTimelineEvent, type TimelineEvent } from "@/lib/realtime-protocol";

const actorSelect = { id: true, email: true, name: true } as const;

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

  try {
    await publishSessionMessage(input.sessionId, { type: "event.append", event });
  } catch (err) {
    console.warn("Redis publish failed", err);
  }

  return event;
}
