import type { VercelRequest } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Service-role client: server-only, bypasses RLS by design, never shipped to the browser.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export const getBearerToken = (req: VercelRequest): string | null => {
  const header = req.headers.authorization ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token || null;
};

/**
 * Verifies the caller's Supabase session (if any) and looks up their stored Gemini key.
 * The key is never echoed back to the client from this helper's callers.
 */
export const resolveUserAndKey = async (
  req: VercelRequest
): Promise<{ userId: string | null; apiKey: string | null }> => {
  const token = getBearerToken(req);
  if (!token) return { userId: null, apiKey: null };

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return { userId: null, apiKey: null };

  const { data } = await supabaseAdmin
    .from('user_llm_keys')
    .select('api_key')
    .eq('user_id', user.id)
    .maybeSingle();

  return { userId: user.id, apiKey: data?.api_key ?? null };
};
