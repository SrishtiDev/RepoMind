import Redis from "ioredis";
import "dotenv/config";

const DAILY_QUOTA_LIMIT = 15; // Hard cap below the 20/day actual limit
const REDIS_KEY_PREFIX = "gemini:quota:daily:";

let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
    });
  }
  return redisClient;
}

function getTodayKey(): string {
  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `${REDIS_KEY_PREFIX}${dateStr}`;
}

/**
 * Checks if we have budget for another request.
 * If yes, increments the daily counter.
 */
export async function consumeQuota(): Promise<boolean> {
  const redis = getRedis();
  const key = getTodayKey();
  
  try {
    const current = await redis.get(key);
    if (current && parseInt(current, 10) >= DAILY_QUOTA_LIMIT) {
      return false; // Quota exceeded
    }

    const nextVal = await redis.incr(key);
    if (nextVal === 1) {
      await redis.expire(key, 86400); // 24 hours
    }
    
    return true; // Approved
  } catch (err) {
    console.error("[Gemini Quota] Failed to check quota in Redis:", err);
    // If Redis fails, fail open (allow) but warn.
    return true; 
  }
}

/**
 * Directly marks the daily quota as exhausted (e.g. if we get a live 429 quota error)
 */
export async function exhaustQuota(): Promise<void> {
  const redis = getRedis();
  const key = getTodayKey();
  try {
    await redis.set(key, DAILY_QUOTA_LIMIT.toString(), "EX", 86400);
  } catch (err) {
    console.error("[Gemini Quota] Failed to exhaust quota in Redis:", err);
  }
}
