import { Queue } from "bullmq";
import Redis from "ioredis";
import { getRedisPublisher } from "@/lib/redis";
import { abortKey, AGENT_QUEUE_NAME } from "@/lib/agent/limits";

export type AgentJobData = {
  runId: string;
  sessionId: string;
};

const globalForQueue = globalThis as unknown as {
  agentQueue?: Queue<AgentJobData>;
  bullmqRedis?: Redis;
};

export function redisUrl() {
  return process.env.REDIS_URL ?? "redis://localhost:6379";
}

export function createBullmqRedis() {
  return new Redis(redisUrl(), { maxRetriesPerRequest: null });
}

export function getBullmqRedis() {
  if (!globalForQueue.bullmqRedis) {
    globalForQueue.bullmqRedis = createBullmqRedis();
  }
  return globalForQueue.bullmqRedis;
}

export function getAgentQueue() {
  if (!globalForQueue.agentQueue) {
    globalForQueue.agentQueue = new Queue<AgentJobData>(AGENT_QUEUE_NAME, {
      connection: getBullmqRedis(),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
  }
  return globalForQueue.agentQueue;
}

export async function enqueueAgentRun(data: AgentJobData) {
  await getAgentQueue().add("run", data, { jobId: data.runId });
}

export async function requestRunAbort(runId: string) {
  const redis = getRedisPublisher();
  await redis.set(abortKey(runId), "1", "EX", 60 * 20);
  try {
    const job = await getAgentQueue().getJob(runId);
    if (job) {
      const state = await job.getState();
      if (state === "waiting" || state === "delayed" || state === "prioritized") {
        await job.remove();
      }
    }
  } catch (err) {
    console.warn("Failed to remove queued agent job", err);
  }
}

export async function isRunAborted(runId: string) {
  const value = await getRedisPublisher().get(abortKey(runId));
  return value === "1";
}

export async function clearRunAbort(runId: string) {
  await getRedisPublisher().del(abortKey(runId));
}
