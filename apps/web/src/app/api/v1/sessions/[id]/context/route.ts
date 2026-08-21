import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeContext } from "@/lib/agent/serialize";
import { SESSION_EVENT_TYPES } from "@/lib/realtime-protocol";
import { loadWorkspaceSession, sessionAccessError } from "@/lib/session-access";
import { appendSessionEvent } from "@/lib/session-events";
import { canRunAgent } from "@/lib/session-roles";

type Params = { params: Promise<{ id: string }> };

const CONTEXT_KINDS = new Set(["log", "note", "error_snippet"]);

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const access = await loadWorkspaceSession(user.id, id);

    if (!access.ok) {
      const { body, status } = sessionAccessError(access);
      return NextResponse.json(body, { status });
    }

    const contexts = await prisma.sessionContext.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { createdBy: { select: { id: true, email: true, name: true } } },
    });

    return NextResponse.json({ contexts: contexts.map(serializeContext) });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to load context");
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const access = await loadWorkspaceSession(user.id, id);

    if (!access.ok) {
      const { body, status } = sessionAccessError(access);
      return NextResponse.json(body, { status });
    }

    const participant = access.session.participants.find((p) => p.userId === user.id);
    if (!canRunAgent(participant?.role)) {
      return NextResponse.json({ error: "Viewers cannot add context", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const kind = typeof body.kind === "string" ? body.kind : "log";
    if (!CONTEXT_KINDS.has(kind)) {
      return NextResponse.json({ error: "Invalid context kind" }, { status: 400 });
    }
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "Context is required" }, { status: 400 });
    }
    if (content.length > 20_000) {
      return NextResponse.json({ error: "Context is too long" }, { status: 400 });
    }

    const context = await prisma.sessionContext.create({
      data: {
        sessionId: id,
        kind,
        content,
        createdById: user.id,
      },
      include: { createdBy: { select: { id: true, email: true, name: true } } },
    });

    const event = await appendSessionEvent({
      sessionId: id,
      type: SESSION_EVENT_TYPES.contextAdded,
      actorId: user.id,
      payload: { contextId: context.id, kind },
    });

    return NextResponse.json({ context: serializeContext(context), event }, { status: 201 });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to add context");
    return NextResponse.json(body, { status });
  }
}
