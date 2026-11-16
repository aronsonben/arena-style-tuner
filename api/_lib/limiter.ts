import type { VercelRequest } from '@vercel/node';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Marketplace integration prefixes its env vars, so Redis.fromEnv() can't find them.
const redis = new Redis({
  url: process.env.UPSTASH_CONCOURSE_KV_REST_API_URL!,
  token: process.env.UPSTASH_CONCOURSE_KV_REST_API_TOKEN!,
});

// Generations allowed on the shared GEMINI_API_KEY before a user must bring their own.
export const FREE_DAILY_LIMIT = 2;
// Abuse backstop for users generating with their own key (their own Gemini billing applies).
const BYOK_DAILY_LIMIT = 50;
const GLOBAL_DAILY_LIMIT = 200;

// `vercel dev` sets VERCEL_ENV=development; deployed builds use preview/production.
export const IS_DEV = process.env.NODE_ENV === 'development';

export const perIpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(FREE_DAILY_LIMIT, '1 d'),
  prefix: 'rl:ip',
});

export const perUserLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(BYOK_DAILY_LIMIT, '1 d'),
  prefix: 'rl:user',
});

export const globalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(GLOBAL_DAILY_LIMIT, '1 d'),
  prefix: 'rl:global',
});

export const GLOBAL_KEY = 'all';

export const getClientIp = (req: VercelRequest): string =>
  String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';
