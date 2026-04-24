
const GENERATION_KEY_SHARED = 'arena_synth_generations_used';
const GENERATION_KEY_OWN = 'arena_synth_generations_used_own';
const MAX_GENERATIONS_WITH_KEY = 10;
const MAX_GENERATIONS_WITHOUT_KEY = 5;

export const RateLimitService = {
  /**
   * Checks if the user has remaining generations.
   * hasUserKey: true = user provided their own API key (10 gens).
   * hasUserKey: false = using shared fallback key (5 gens).
   * Always allows in development mode.
   */
  checkLimit: (hasUserKey: boolean): { allowed: boolean; remaining: number; reason?: string } => {
    const max = hasUserKey ? MAX_GENERATIONS_WITH_KEY : MAX_GENERATIONS_WITHOUT_KEY;
    if (import.meta.env.DEV) {
      return { allowed: true, remaining: max };
    }
    const storageKey = hasUserKey ? GENERATION_KEY_OWN : GENERATION_KEY_SHARED;
    try {
      const used = parseInt(localStorage.getItem(storageKey) ?? '0', 10);
      const remaining = Math.max(0, max - used);
      const allowed = remaining > 0;
      const reason = allowed
        ? undefined
        : `You've used all ${max} generations. ${hasUserKey ? 'Email borice.brainblasts@gmail.com to request more.' : 'Add your own API key for 10 generations.'}`;
      return { allowed, remaining, reason };
    } catch (e) {
      console.warn('Rate limit check failed', e);
      return { allowed: true, remaining: 1 };
    }
  },

  /**
   * Records a new successful generation.
   */
  recordUsage: (hasUserKey: boolean) => {
    if (import.meta.env.DEV) return;
    const storageKey = hasUserKey ? GENERATION_KEY_OWN : GENERATION_KEY_SHARED;
    try {
      const used = parseInt(localStorage.getItem(storageKey) ?? '0', 10);
      localStorage.setItem(storageKey, String(used + 1));
    } catch (e) {
      console.warn('Failed to record usage', e);
    }
  }
};
