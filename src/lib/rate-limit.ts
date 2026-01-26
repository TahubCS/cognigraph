import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// File Upload Rate Limiter - 10 uploads per 30 minutes
export const uploadRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "30 m"),
    analytics: true,
    prefix: "@upstash/ratelimit/upload",
});

// Chat Rate Limiter - 50 messages per 30 minutes
export const chatRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "30 m"),
    analytics: true,
    prefix: "@upstash/ratelimit/chat",
});

// Graph Data Rate Limiter - 100 requests per 30 minutes
export const graphRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "30 m"),
    analytics: true,
    prefix: "@upstash/ratelimit/graph",
});