import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { SESSION_EVENT_TYPES } from "@/lib/realtime-protocol";
import { loadWorkspaceSession, sessionAccessError } from "@/lib/session-access";
import { appendSessionEvent } from "@/lib/session-events";
import { canSendMessages } from "@/lib/session-roles";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const access = await loadWorkspaceSession(user.id, id);

    if (!access.ok) {
      const { body, status } = sessionAccessError(access);
      return NextResponse.json(body, { status });
    }

    const { session } = access;

    const participant = session.participants.find((p) => p.userId === user.id);
    if (!canSendMessages(participant?.role)) {
      return NextResponse.json({ error: "Viewers cannot send messages", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (text.length > 4000) {
      return NextResponse.json({ error: "Message is too long" }, { status: 400 });
    }

    const event = await appendSessionEvent({
      sessionId: session.id,
      type: SESSION_EVENT_TYPES.messageUser,
      actorId: user.id,
      payload: { text, userId: user.id },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to send message");
    return NextResponse.json(body, { status });
  }
}
