import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { Worker } from "bullmq";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { AGENT_QUEUE_NAME, AGENT_RUN_LOCK_MS } = await import("@/lib/agent/limits");
  const { createBullmqRedis } = await import("@/lib/agent/queue");
  const { runAgentJob } = await import("@/lib/agent/loop");
  type AgentJobData = { runId: string; sessionId: string };

  const connection = createBullmqRedis();

  const worker = new Worker<AgentJobData>(
    AGENT_QUEUE_NAME,
    async (job) => {
      const { runId, sessionId } = job.data;
      console.log(`Agent run ${runId} starting for session ${sessionId}`);
      await runAgentJob(runId, sessionId);
    },
    {
      connection,
      concurrency: 2,
      lockDuration: AGENT_RUN_LOCK_MS,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`Agent job ${job?.id} failed`, err);
  });

  worker.on("ready", () => {
    console.log(`Agent worker listening on queue ${AGENT_QUEUE_NAME}`);
  });

  async function shutdown() {
    await worker.close();
    await connection.quit();
    process.exit(0);
  }

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void main().catch((err) => {
  console.error("Agent worker failed to start", err);
  process.exit(1);
});
