import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SESSION_EVENT_TYPES } from "@/lib/realtime-protocol";
import { loadWorkspaceSession, sessionDetailInclude } from "@/lib/session-access";
import { appendSessionEvent } from "@/lib/session-events";
import { isParticipantRole, isSessionOwner } from "@/lib/session-roles";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { session } = await loadWorkspaceSession(user.id, id);

    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const me = session.participants.find((p) => p.userId === user.id);
    if (!isSessionOwner(me?.role)) {
      return NextResponse.json({ error: "Only the owner can change roles", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const roleRaw = typeof body.role === "string" ? body.role : "";

    if (!userId || !isParticipantRole(roleRaw)) {
      return NextResponse.json({ error: "userId and a valid role are required" }, { status: 400 });
    }

    if (roleRaw === "owner") {
      return NextResponse.json({ error: "Use handoff to transfer ownership" }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
    }

    const target = session.participants.find((p) => p.userId === userId);
    if (!target) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    if (target.role === "owner") {
      return NextResponse.json({ error: "Cannot change the owner role" }, { status: 400 });
    }

    const updated = await prisma.sessionParticipant.update({
      where: { sessionId_userId: { sessionId: session.id, userId } },
      data: { role: roleRaw },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    const event = await appendSessionEvent({
      sessionId: session.id,
      type: SESSION_EVENT_TYPES.roleChanged,
      actorId: user.id,
      payload: { userId, role: roleRaw, previousRole: target.role },
    });

    const nextSession = await prisma.session.findFirst({
      where: { id: session.id },
      include: sessionDetailInclude,
    });

    return NextResponse.json({ participant: updated, session: nextSession, event });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to update role");
    return NextResponse.json(body, { status });
  }
}
