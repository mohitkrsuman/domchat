import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SESSION_EVENT_TYPES } from "@/lib/realtime-protocol";
import { loadWorkspaceSession, sessionDetailInclude } from "@/lib/session-access";
import { appendSessionEvent } from "@/lib/session-events";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { session } = await loadWorkspaceSession(user.id, id);

    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existing = session.participants.find((p) => p.userId === user.id);
    if (existing) {
      return NextResponse.json({
        participant: {
          userId: existing.userId,
          role: existing.role,
          joinedAt: existing.joinedAt,
          user: existing.user,
        },
        created: false,
      });
    }

    const role = session.ownerId === user.id ? "owner" : "contributor";

    const participant = await prisma.sessionParticipant.create({
      data: {
        sessionId: session.id,
        userId: user.id,
        role,
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    await appendSessionEvent({
      sessionId: session.id,
      type: SESSION_EVENT_TYPES.participantJoined,
      actorId: user.id,
      payload: { userId: user.id, role, name: user.name, email: user.email },
    });

    const updated = await prisma.session.findFirst({
      where: { id: session.id },
      include: sessionDetailInclude,
    });

    return NextResponse.json(
      {
        participant: {
          userId: participant.userId,
          role: participant.role,
          joinedAt: participant.joinedAt,
          user: participant.user,
        },
        session: updated,
        created: true,
      },
      { status: 201 }
    );
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to join session");
    return NextResponse.json(body, { status });
  }
}
