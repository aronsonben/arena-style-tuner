
import { ProcessedImage } from '../types';
import { supabase } from './supabase';

export interface GenerationResult {
  imageUrl: string;
  promptTokens: number;
  candidateTokens: number;
  remaining: number | null;
}

export interface QuotaResult {
  remaining: number | null;
  hasOwnKey: boolean;
}

const authHeader = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
};

export const fetchQuota = async (): Promise<QuotaResult> => {
  const res = await fetch('/api/quota', { headers: await authHeader() });
  if (!res.ok) throw new Error('Quota unavailable');
  return res.json();
};

/**
 * Generates a new image that synthesizes the stylistic "DNA" of reference images.
 * The server resolves the caller's own Gemini key (if any) from their Supabase session;
 * no key is ever sent from or returned to the browser.
 */
export const generateStyledImage = async (
  prompt: string,
  referenceImages: ProcessedImage[]
): Promise<GenerationResult> => {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({
      prompt,
      referenceImages: referenceImages
        .filter(img => img.base64 && img.mimeType)
        .map(img => ({ base64: img.base64, mimeType: img.mimeType })),
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Generation failed (${res.status})`);
  }

  return res.json();
};
