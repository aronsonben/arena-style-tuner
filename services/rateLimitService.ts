
const GENERATION_KEY = 'arena_synth_generations_used';
const MAX_GENERATIONS = 10;

export const RateLimitService = {
  /**
   * Checks if the user has remaining generations.
   * Always allows in development mode.
   */
  checkLimit: (): { allowed: boolean; remaining: number; reason?: string } => {
    if (import.meta.env.DEV) {
      return { allowed: true, remaining: MAX_GENERATIONS };
    }
    try {
      const used = parseInt(localStorage.getItem(GENERATION_KEY) ?? '0', 10);
      const remaining = Math.max(0, MAX_GENERATIONS - used);
      const allowed = remaining > 0;
      const reason = allowed
        ? undefined
        : `You've used all ${MAX_GENERATIONS} generations. Email borice.brainblasts@gmail.com to request more.`;
      return { allowed, remaining, reason };
    } catch (e) {
      console.warn('Rate limit check failed', e);
      return { allowed: true, remaining: 1 };
    }
  },

  /**
   * Records a new successful generation.
   */
  recordUsage: () => {
    if (import.meta.env.DEV) return;
    try {
      const used = parseInt(localStorage.getItem(GENERATION_KEY) ?? '0', 10);
      localStorage.setItem(GENERATION_KEY, String(used + 1));
    } catch (e) {
      console.warn('Failed to record usage', e);
    }
  }
};
