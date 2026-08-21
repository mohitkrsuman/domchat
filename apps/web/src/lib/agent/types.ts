export const ACTIVE_RUN_STATUSES = ["queued", "running"] as const;

export type AgentRunStatusValue = "queued" | "running" | "stopped" | "completed" | "failed";

export type AgentRunDto = {
  id: string;
  sessionId: string;
  status: AgentRunStatusValue;
  requestedById: string;
  prompt: string | null;
  error: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
};

export type SessionContextDto = {
  id: string;
  sessionId: string;
  kind: string;
  content: string;
  createdById: string;
  createdAt: string;
  createdBy?: { id: string; email: string; name: string | null };
};

export function isActiveRunStatus(status: string): status is "queued" | "running" {
  return status === "queued" || status === "running";
}
