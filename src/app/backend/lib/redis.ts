"server-only";

import Redis from "ioredis"
import { Ratelimit } from "@upstash/ratelimit";

const publisher = new Redis(process.env.REDIS_URL!);
const subscriber = new Redis(process.env.REDIS_URL!);

// Rate limiter for authenticated users - 60 requests per hour
const rateLimiterAuth = new Ratelimit({
  redis: publisher as any,
  limiter: Ratelimit.slidingWindow(60, "1 h"),
  analytics: true,
  prefix: "ratelimit:auth",
});

// Rate limiter for anonymous users - 20 requests per hour
const rateLimiterAnon = new Ratelimit({
  redis: publisher as any,
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