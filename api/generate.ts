import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { perIpLimiter, globalLimiter, GLOBAL_KEY, getClientIp, IS_DEV, PER_IP_DAILY_LIMIT } from './_lib/limiter.js';

export const config = { maxDuration: 60 };

const MODEL_NAME = 'gemini-3-pro-image-preview';
const MAX_REFERENCE_IMAGES = 10;
const MAX_PROMPT_LENGTH = 2000;

const SYSTEM_INSTRUCTION = `You are a world-class visual synthesizer. 
  Extract the color theory, composition, lighting, and textures from the provided reference images.
  Generate a SINGLE high-quality image of the user prompt description strictly following that style.
  Output ONLY the image data. No collage, no text in the image.`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Gemini image generate handler for Vercel serverless function
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, referenceImages, apiKey } = req.body ?? {};

  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ error: 'Invalid prompt.' });
  }
  if (!Array.isArray(referenceImages) || referenceImages.length > MAX_REFERENCE_IMAGES) {
    return res.status(400).json({ error: 'Invalid reference images.' });
  }

  const key = IS_DEV
    ? process.env.GEMINI_API_KEY
    : (typeof apiKey === 'string' && apiKey) || process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Server API key is not configured.' });
  }

  // Fail closed: if the limiter store is down, don't spend on Gemini.
  let remaining = PER_IP_DAILY_LIMIT;
  try {
    if (!IS_DEV) {
      const ipResult = await perIpLimiter.limit(getClientIp(req));
      if (!ipResult.success) {
        return res.status(429).json({ error: 'Daily generation limit reached.', remaining: 0, resetsAt: ipResult.reset });
      }
      const globalResult = await globalLimiter.limit(GLOBAL_KEY);
      if (!globalResult.success) {
        return res.status(429).json({ error: 'The demo is at capacity today. Please try again tomorrow.', remaining: ipResult.remaining, resetsAt: globalResult.reset });
      }
      remaining = ipResult.remaining;
    }
  } catch (err) {
    console.error('[api/generate] Rate limiter error:', err);
    return res.status(503).json({ error: 'Service temporarily unavailable.' });
  }

  const parts: any[] = [];
  for (const img of referenceImages) {
    if (typeof img?.base64 === 'string' && typeof img?.mimeType === 'string') {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    }
  }
  parts.push({ text: `Subject: ${prompt}` });

  const ai = new GoogleGenAI({ apiKey: key });
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          imageConfig: { aspectRatio: '1:1', imageSize: '1K' },
        },
      });

      const usage = response.usageMetadata;
      const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);

      if (!imagePart?.inlineData?.data) {
        console.warn('[api/generate] No image part:', JSON.stringify(response.candidates?.[0]?.content));
        return res.status(502).json({
          error: 'The model did not return an image. This can happen if the references are too complex or trigger safety filters.',
        });
      }

      return res.status(200).json({
        imageUrl: `data:image/png;base64,${imagePart.inlineData.data}`,
        promptTokens: usage?.promptTokenCount || 0,
        candidateTokens: usage?.candidatesTokenCount || 0,
        remaining,
      });
    } catch (err: any) {
      const msg: string = err?.message || JSON.stringify(err);
      const retryable = msg.includes('503') || msg.toLowerCase().includes('overloaded') || msg.includes('429');

      if (retryable && attempt < maxAttempts - 1) {
        await delay(2000 * Math.pow(2, attempt));
        continue;
      }

      console.error('[api/generate] Error:', msg);
      return res.status(retryable ? 503 : 500).json({
        error: retryable ? 'Service is busy. Please try again shortly.' : 'Image generation failed.',
      });
    }
  }
}
