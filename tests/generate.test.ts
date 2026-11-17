import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { GoogleGenAI } from '@google/genai';

const { mockResolveUserAndKey } = vi.hoisted(() => ({
  mockResolveUserAndKey: vi.fn(),
}));

const { mockPerUserLimit, mockPerIpLimit, mockGlobalLimit } = vi.hoisted(() => ({
  mockPerUserLimit: vi.fn(),
  mockPerIpLimit: vi.fn(),
  mockGlobalLimit: vi.fn(),
}));

const { mockGenerateContent, mockGoogleGenAI } = vi.hoisted(() => {
  const mockGenerateContent = vi.fn();
  // Must be a `function`, not an arrow function — generate.ts calls `new GoogleGenAI(...)`
  // and arrow functions can never be invoked as constructors.
  const mockGoogleGenAI = vi.fn().mockImplementation(function (opts: { apiKey: string }) {
    return {
      apiKey: opts.apiKey,
      models: { generateContent: mockGenerateContent },
    };
  });
  return { mockGenerateContent, mockGoogleGenAI };
});

vi.mock('../api/_lib/userKey.js', () => ({
  resolveUserAndKey: mockResolveUserAndKey,
}));

vi.mock('../api/_lib/limiter.js', () => ({
  IS_DEV: false,
  FREE_DAILY_LIMIT: 2,
  GLOBAL_KEY: 'all',
  getClientIp: () => '127.0.0.1',
  perUserLimiter: { limit: mockPerUserLimit },
  perIpLimiter: { limit: mockPerIpLimit },
  globalLimiter: { limit: mockGlobalLimit },
}));

vi.mock('@google/genai', () => ({ GoogleGenAI: mockGoogleGenAI }));

const { default: handler } = await import('../api/generate.js');

function makeReq(body: Record<string, unknown>): VercelRequest {
  return { method: 'POST', body, headers: {} } as unknown as VercelRequest;
}

function makeRes() {
  const res: { statusCode: number; body: any; status: (c: number) => any; json: (p: any) => any } = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as VercelResponse & typeof res;
}

const okGeminiResponse = {
  usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
  candidates: [{ content: { parts: [{ inlineData: { data: 'base64img' } }] } }],
};

beforeEach(() => {
  mockResolveUserAndKey.mockReset();
  mockPerUserLimit.mockReset();
  mockPerIpLimit.mockReset();
  mockGlobalLimit.mockReset();
  mockGenerateContent.mockReset();
  mockGoogleGenAI.mockClear();
  process.env.GEMINI_API_KEY = 'shared-env-key';
});

describe('POST /api/generate', () => {
  it('uses the BYOK key and reports remaining: null when the user has a stored key', async () => {
    mockResolveUserAndKey.mockResolvedValue({ userId: 'user-1', apiKey: 'own-gemini-key' });
    mockPerUserLimit.mockResolvedValue({ success: true });
    mockGenerateContent.mockResolvedValue(okGeminiResponse);

    const req = makeReq({ prompt: 'a style', referenceImages: [] });
    const res = makeRes();
    await handler(req, res);

    expect(mockGoogleGenAI).toHaveBeenCalledWith({ apiKey: 'own-gemini-key' });
    expect(res.statusCode).toBe(200);
    expect(res.body.remaining).toBeNull();
    expect(mockPerIpLimit).not.toHaveBeenCalled();
    expect(mockGlobalLimit).not.toHaveBeenCalled();
  });

  it('falls back to the shared GEMINI_API_KEY and deducts free quota for non-BYOK users', async () => {
    mockResolveUserAndKey.mockResolvedValue({ userId: null, apiKey: null });
    mockPerIpLimit.mockResolvedValue({ success: true, remaining: 1 });
    mockGlobalLimit.mockResolvedValue({ success: true });
    mockGenerateContent.mockResolvedValue(okGeminiResponse);

    const req = makeReq({ prompt: 'a style', referenceImages: [] });
    const res = makeRes();
    await handler(req, res);

    expect(mockGoogleGenAI).toHaveBeenCalledWith({ apiKey: 'shared-env-key' });
    expect(res.statusCode).toBe(200);
    expect(res.body.remaining).toBe(1);
    expect(mockPerUserLimit).not.toHaveBeenCalled();
  });

  it('rejects non-BYOK requests once the free daily limit is reached', async () => {
    mockResolveUserAndKey.mockResolvedValue({ userId: null, apiKey: null });
    mockPerIpLimit.mockResolvedValue({ success: false, remaining: 0, reset: 12345 });

    const req = makeReq({ prompt: 'a style', referenceImages: [] });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.body.needsApiKey).toBe(true);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('rejects requests with an invalid or oversized prompt before touching Gemini', async () => {
    const req = makeReq({ prompt: '', referenceImages: [] });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(mockResolveUserAndKey).not.toHaveBeenCalled();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  // Documents current behavior: a revoked/invalid BYOK key surfaces from the Gemini SDK
  // as a "403 PERMISSION_DENIED"-style error, which App.tsx's handleGenerate relies on
  // (via `errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED")`) to flip
  // hasStoredKey back to false. This test currently FAILS because generate.ts's catch-all
  // branch discards the underlying Gemini error message and always responds with a generic
  // 500 "Image generation failed." — the "403"/"PERMISSION_DENIED" signal never reaches the client.
  it('surfaces a 403/PERMISSION_DENIED-style error when the stored BYOK key is revoked', async () => {
    mockResolveUserAndKey.mockResolvedValue({ userId: 'user-1', apiKey: 'revoked-key' });
    mockPerUserLimit.mockResolvedValue({ success: true });
    mockGenerateContent.mockRejectedValue(new Error('403 PERMISSION_DENIED: API key not valid'));

    const req = makeReq({ prompt: 'a style', referenceImages: [] });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/PERMISSION_DENIED/);
  });
});
