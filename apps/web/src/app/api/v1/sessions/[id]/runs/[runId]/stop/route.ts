import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requestRunAbort } from "@/lib/agent/queue";
import { isActiveRunStatus, serializeRun } from "@/lib/agent/serialize";
import { SESSION_EVENT_TYPES } from "@/lib/realtime-protocol";
import { loadWorkspaceSession, sessionAccessError } from "@/lib/session-access";
import { appendSessionEvent, publishRealtime } from "@/lib/session-events";
import { canRunAgent } from "@/lib/session-roles";

type Params = { params: Promise<{ id: string; runId: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id, runId } = await params;
    const access = await loadWorkspaceSession(user.id, id);

    if (!access.ok) {
      const { body, status } = sessionAccessError(access);
      return NextResponse.json(body, { status });
    }

    const participant = access.session.participants.find((p) => p.userId === user.id);
    if (!canRunAgent(participant?.role)) {
      return NextResponse.json({ error: "Viewers cannot stop agent runs", code: "FORBIDDEN" }, { status: 403 });
    }

    const run = await prisma.agentRun.findFirst({
      where: { id: runId, sessionId: id },
    });
    if (!run) {
      return NextResponse.json({ error: "Run not found", code: "NOT_FOUND" }, { status: 404 });
    }
    if (!isActiveRunStatus(run.status)) {
      return NextResponse.json({ run: serializeRun(run) });
    }

    await requestRunAbort(run.id);

    const stoppedCount = await prisma.agentRun.updateMany({
      where: { id: run.id, status: "queued" },
      data: { status: "stopped", endedAt: new Date() },
    });

    if (stoppedCount.count > 0) {
      const stopped = await prisma.agentRun.findUniqueOrThrow({ where: { id: run.id } });
      const event = await appendSessionEvent({
        sessionId: id,
        type: SESSION_EVENT_TYPES.runStopped,
        actorId: user.id,
        payload: { runId: stopped.id, reason: "user_stop" },
      });
      await publishRealtime(id, { type: "run.status", runId: stopped.id, status: stopped.status });
      return NextResponse.json({ run: serializeRun(stopped), event });
    }

    return NextResponse.json({ run: serializeRun(run), stopping: true });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to stop agent run");
    return NextResponse.json(body, { status });
  }
}
