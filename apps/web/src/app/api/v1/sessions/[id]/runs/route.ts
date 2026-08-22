import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enqueueAgentRun } from "@/lib/agent/queue";
import { ACTIVE_RUN_STATUSES, serializeRun } from "@/lib/agent/serialize";
import { SESSION_EVENT_TYPES, type TimelineEvent } from "@/lib/realtime-protocol";
import { loadWorkspaceSession, sessionAccessError } from "@/lib/session-access";
import { appendSessionEvent, publishRealtime } from "@/lib/session-events";
import { canRunAgent } from "@/lib/session-roles";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const access = await loadWorkspaceSession(user.id, id);

    if (!access.ok) {
      const { body, status } = sessionAccessError(access);
      return NextResponse.json(body, { status });
    }

    const [active, latest] = await Promise.all([
      prisma.agentRun.findFirst({
        where: { sessionId: id, status: { in: [...ACTIVE_RUN_STATUSES] } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.agentRun.findFirst({
        where: { sessionId: id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      active: active ? serializeRun(active) : null,
      latest: latest ? serializeRun(latest) : null,
    });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to load runs");
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

    const { session } = access;
    const participant = session.participants.find((p) => p.userId === user.id);
    if (!canRunAgent(participant?.role)) {
      return NextResponse.json({ error: "Viewers cannot start agent runs", code: "FORBIDDEN" }, { status: 403 });
    }

    const existing = await prisma.agentRun.findFirst({
      where: { sessionId: session.id, status: { in: [...ACTIVE_RUN_STATUSES] } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A run is already in progress", code: "RUN_ACTIVE", run: serializeRun(existing) },
        { status: 409 }
      );
    }

    let prompt: string | null = null;
    try {
      const body = await req.json();
      if (typeof body.prompt === "string") {
        const trimmed = body.prompt.trim();
        if (trimmed.length > 4000) {
          return NextResponse.json({ error: "Prompt is too long" }, { status: 400 });
        }
        prompt = trimmed || null;
      }
    } catch {
      prompt = null;
    }

    const run = await prisma.agentRun.create({
      data: {
        sessionId: session.id,
        requestedById: user.id,
        status: "queued",
        prompt,
      },
    });

    const events: TimelineEvent[] = [];
    if (prompt) {
      events.push(
        await appendSessionEvent({
          sessionId: session.id,
          type: SESSION_EVENT_TYPES.messageUser,
          actorId: user.id,
          payload: { text: prompt, userId: user.id, runId: run.id },
        })
      );
    }

    const event = await appendSessionEvent({
      sessionId: session.id,
      type: SESSION_EVENT_TYPES.runStarted,
      actorId: user.id,
      payload: { runId: run.id, prompt },
    });
    events.push(event);
    await publishRealtime(session.id, { type: "run.status", runId: run.id, status: run.status });

    try {
      await enqueueAgentRun({ runId: run.id, sessionId: session.id });
    } catch (err) {
      const failed = await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          error: "Failed to enqueue agent run",
          endedAt: new Date(),
        },
      });
      await appendSessionEvent({
        sessionId: session.id,
        type: SESSION_EVENT_TYPES.runFailed,
        payload: { runId: failed.id, error: failed.error },
      });
      await publishRealtime(session.id, { type: "run.status", runId: failed.id, status: failed.status });
      console.error("enqueue agent run failed", err);
      return NextResponse.json({ error: "Failed to start agent run" }, { status: 502 });
    }

    return NextResponse.json({ run: serializeRun(run), event, events }, { status: 201 });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to start agent run");
    return NextResponse.json(body, { status });
  }
}
