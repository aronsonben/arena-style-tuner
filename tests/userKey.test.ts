import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest } from '@vercel/node';

// vi.hoisted so these mocks exist before the vi.mock factory below runs.
const { mockGetUser, mockRpc, mockMaybeSingle } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRpc: vi.fn(),
  mockMaybeSingle: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  })),
}));

const { resolveUserAndKey, getBearerToken } = await import('../api/_lib/userKey.js');

function makeReq(authHeader?: string): VercelRequest {
  return { headers: { authorization: authHeader } } as unknown as VercelRequest;
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockRpc.mockReset().mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockMaybeSingle.mockReset();
});

describe('getBearerToken', () => {
  it('extracts the token from a Bearer Authorization header', () => {
    expect(getBearerToken(makeReq('Bearer abc123'))).toBe('abc123');
  });

  it('returns null when no Authorization header is present', () => {
    expect(getBearerToken(makeReq())).toBeNull();
  });

  it('returns null for an empty/whitespace-only header', () => {
    expect(getBearerToken(makeReq('   '))).toBeNull();
  });
});

describe('resolveUserAndKey', () => {
  it('returns nulls when there is no Authorization header', async () => {
    const result = await resolveUserAndKey(makeReq());
    expect(result).toEqual({ userId: null, apiKey: null });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('returns nulls when the bearer token is invalid/expired', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await resolveUserAndKey(makeReq('Bearer bad-token'));
    expect(result).toEqual({ userId: null, apiKey: null });
  });

  it('returns the userId with a null apiKey when the user has no stored key', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockMaybeSingle.mockResolvedValue({ data: null });
    const result = await resolveUserAndKey(makeReq('Bearer good-token'));
    expect(result).toEqual({ userId: 'user-1', apiKey: null });
    expect(mockRpc).toHaveBeenCalledWith('get_user_llm_key', { p_user_id: 'user-1' });
  });

  it('returns the userId and apiKey when the user has a stored key', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockMaybeSingle.mockResolvedValue({ data: 'stored-gemini-key' });
    const result = await resolveUserAndKey(makeReq('Bearer good-token'));
    expect(result).toEqual({ userId: 'user-1', apiKey: 'stored-gemini-key' });
  });

  // Regression test for the TS fix: an unexpected object shape from the RPC must
  // never be passed through as a truthy, non-string "apiKey".
  it('coerces a non-string RPC result (e.g. {}) to a null apiKey', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockMaybeSingle.mockResolvedValue({ data: {} });
    const result = await resolveUserAndKey(makeReq('Bearer good-token'));
    expect(result).toEqual({ userId: 'user-1', apiKey: null });
  });
});
