import type { VercelRequest, VercelResponse } from '@vercel/node';
import { perIpLimiter, getClientIp, IS_DEV, PER_IP_DAILY_LIMIT } from './_lib/limiter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (IS_DEV) {
    return res.status(200).json({ remaining: PER_IP_DAILY_LIMIT, resetsAt: 0 });
  }

  try {
    const { remaining, reset } = await perIpLimiter.getRemaining(getClientIp(req));
    return res.status(200).json({ remaining, resetsAt: reset });
  } catch (err) {
    console.error('[api/quota] Error:', err);
    return res.status(503).json({ error: 'Quota unavailable.' });
  }
}
