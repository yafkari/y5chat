"server-only";

import IoRedis from "ioredis"
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";


const publisher = new IoRedis(process.env.REDIS_URL!);
const subscriber = new IoRedis(process.env.REDIS_URL!);
const rateLimiterRedis = Redis.fromEnv();

// Rate limiter for authenticated users - 60 requests per hour
const rateLimiterAuth = new Ratelimit({
  redis: rateLimiterRedis,
  limiter: Ratelimit.slidingWindow(60, "1 h"),
  analytics: true,
  prefix: "ratelimit:auth",
});

// Rate limiter for anonymous users - 20 requests per hour
const rateLimiterAnon = new Ratelimit({
  redis: rateLimiterRedis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  analytics: true,
  prefix: "ratelimit:anon",
});

export const redis = {
  publisher,
  subscriber,
  rateLimiterAuth,
  rateLimiterAnon,
};