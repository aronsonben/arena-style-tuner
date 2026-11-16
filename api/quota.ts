import type { VercelRequest, VercelResponse } from '@vercel/node';
import { perIpLimiter, getClientIp, IS_DEV, FREE_DAILY_LIMIT } from './_lib/limiter.js';
import { resolveUserAndKey } from './_lib/userKey.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (IS_DEV) {
    return res.status(200).json({ remaining: FREE_DAILY_LIMIT, resetsAt: 0, hasOwnKey: false });
  }

  try {
    const { apiKey } = await resolveUserAndKey(req);
    if (apiKey) {
      // BYOK: not subject to the shared free-quota.
      return res.status(200).json({ remaining: null, resetsAt: 0, hasOwnKey: true });
    }

    const { remaining, reset } = await perIpLimiter.getRemaining(getClientIp(req));
    return res.status(200).json({ remaining, resetsAt: reset, hasOwnKey: false });
  } catch (err) {
    console.error('[api/quota] Error:', err);
    return res.status(503).json({ error: 'Quota unavailable.' });
  }
}
