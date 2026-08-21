export const AGENT_MAX_STEPS = Math.max(1, Number(process.env.AGENT_MAX_STEPS ?? 20) || 20);
export const AGENT_MAX_DURATION_MS = Math.max(
  30_000,
  Number(process.env.AGENT_MAX_DURATION_MS ?? 10 * 60 * 1000) || 10 * 60 * 1000
);

export const AGENT_QUEUE_NAME = "agent-runs";
export const AGENT_RUN_LOCK_MS = AGENT_MAX_DURATION_MS + 60_000;

export function abortKey(runId: string) {
  return `agent-run:${runId}:abort`;
}
