import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redisPublisher?: Redis;
  redisSubscriber?: Redis;
};

function redisUrl() {
  return process.env.REDIS_URL ?? "redis://localhost:6379";
}

export function getRedisPublisher() {
  if (!globalForRedis.redisPublisher) {
    globalForRedis.redisPublisher = new Redis(redisUrl(), { maxRetriesPerRequest: 3 });
  }
  return globalForRedis.redisPublisher;
}

export function createRedisSubscriber() {
  return new Redis(redisUrl(), { maxRetriesPerRequest: 3 });
}

export async function publishSessionMessage(sessionId: string, message: unknown) {
  const publisher = getRedisPublisher();
  await publisher.publish(`session:${sessionId}`, JSON.stringify(message));
}
