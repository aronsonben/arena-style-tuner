
import { ProcessedImage } from '../types';

export interface GenerationResult {
  imageUrl: string;
  promptTokens: number;
  candidateTokens: number;
}

/**
 * Generates a new image that synthesizes the stylistic "DNA" of reference images.
 * apiKey: the user's own key if provided; otherwise the server uses its shared GEMINI_API_KEY.
 */
export const generateStyledImage = async (
  prompt: string,
  referenceImages: ProcessedImage[],
  apiKey?: string
): Promise<GenerationResult> => {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      referenceImages: referenceImages
        .filter(img => img.base64 && img.mimeType)
        .map(img => ({ base64: img.base64, mimeType: img.mimeType })),
      apiKey,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Generation failed (${res.status})`);
  }

  return res.json();
};
