
const USAGE_KEY = 'arena_synth_usage_history';
const TOKEN_KEY = 'arena_synth_token_usage';
const DAILY_REQUEST_LIMIT = 10;
const DAILY_TOKEN_LIMIT = 50000;
const TIME_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

interface TokenUsage {
  timestamp: number;
  tokens: number;
}

export const RateLimitService = {
  /**
   * Checks if the user has remaining quota (requests and tokens).
   */
  checkLimit: (): { allowed: boolean; remainingRequests: number; remainingTokens: number; reason?: string } => {
    try {
      const now = Date.now();
      
      // Check Request History
      const rawRequests = localStorage.getItem(USAGE_KEY);
      const requestHistory: number[] = rawRequests ? JSON.parse(rawRequests) : [];
      const validRequests = requestHistory.filter(time => now - time < TIME_WINDOW);

      // Check Token History
      const rawTokens = localStorage.getItem(TOKEN_KEY);
      const tokenHistory: TokenUsage[] = rawTokens ? JSON.parse(rawTokens) : [];
      const validTokens = tokenHistory.filter(item => now - item.timestamp < TIME_WINDOW);
      
      const totalTokensUsed = validTokens.reduce((sum, item) => sum + item.tokens, 0);

      // Cleanup storage
      if (validRequests.length !== requestHistory.length) {
        localStorage.setItem(USAGE_KEY, JSON.stringify(validRequests));
      }
      if (validTokens.length !== tokenHistory.length) {
        localStorage.setItem(TOKEN_KEY, JSON.stringify(validTokens));
      }

      const requestAllowed = validRequests.length < DAILY_REQUEST_LIMIT;
      const tokenAllowed = totalTokensUsed < DAILY_TOKEN_LIMIT;

      let reason = undefined;
      if (!requestAllowed) reason = "Daily request limit reached (10/day).";
      else if (!tokenAllowed) reason = "Daily token quota exceeded (50k tokens/day).";

      return {
        allowed: requestAllowed && tokenAllowed,
        remainingRequests: DAILY_REQUEST_LIMIT - validRequests.length,
        remainingTokens: DAILY_TOKEN_LIMIT - totalTokensUsed,
        reason
      };
    } catch (e) {
      console.warn('Rate limit check failed', e);
      return { allowed: true, remainingRequests: 1, remainingTokens: 1000 };
    }
  },

  /**
   * Records a new successful generation.
   */
  recordUsage: (promptTokens: number) => {
    try {
      const now = Date.now();
      
      // Update Request History
      const rawReq = localStorage.getItem(USAGE_KEY);
      const reqHistory: number[] = rawReq ? JSON.parse(rawReq) : [];
      reqHistory.push(now);
      localStorage.setItem(USAGE_KEY, JSON.stringify(reqHistory.filter(t => now - t < TIME_WINDOW)));
      
      // Update Token History
      const rawTok = localStorage.getItem(TOKEN_KEY);
      const tokHistory: TokenUsage[] = rawTok ? JSON.parse(rawTok) : [];
      tokHistory.push({ timestamp: now, tokens: promptTokens });
      localStorage.setItem(TOKEN_KEY, JSON.stringify(tokHistory.filter(i => now - i.timestamp < TIME_WINDOW)));

    } catch (e) {
      console.warn('Failed to record usage', e);
    }
  }
};
