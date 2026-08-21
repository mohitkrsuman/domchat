import type { AgentRun, SessionContext } from "@/generated/prisma";
import type { AgentRunDto, SessionContextDto } from "@/lib/agent/types";

export type { AgentRunDto, SessionContextDto } from "@/lib/agent/types";
export { ACTIVE_RUN_STATUSES, isActiveRunStatus } from "@/lib/agent/types";

export function serializeRun(run: AgentRun): AgentRunDto {
  return {
    id: run.id,
    sessionId: run.sessionId,
    status: run.status,
    requestedById: run.requestedById,
    prompt: run.prompt,
    error: run.error,
    startedAt: run.startedAt?.toISOString() ?? null,
    endedAt: run.endedAt?.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
  };
}

export function serializeContext(
  row: SessionContext & {
    createdBy?: { id: string; email: string; name: string | null };
  }
): SessionContextDto {
  return {
    id: row.id,
    sessionId: row.sessionId,
    kind: row.kind,
    content: row.content,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
  };
}
