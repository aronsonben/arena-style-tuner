import React, { useEffect, useState } from 'react';
import { supabase, updatePassword } from '../services/supabase';

const ResetPasswordPage: React.FC = () => {
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // The recovery link signs the user in via URL fragment; wait for that session before showing the form.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasRecoverySession(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setHasRecoverySession(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (newPasswordInput !== confirmPasswordInput) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await updatePassword(newPasswordInput);
      if (error) throw error;
      setIsComplete(true);
    } catch (err: any) {
      setFormError(err.message || 'Could not update your password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-arena-cream text-arena-charcoal dark:bg-arena-dark-bg dark:text-arena-dark-text">
      <div className="w-full max-w-md border border-arena-border dark:border-arena-dark-border rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-light">Set a New Password</h2>
          <p className="text-sm text-arena-text-muted dark:text-arena-dark-text-muted leading-relaxed">
            Choose a new password for your Are.na Style Synthesizer account.
          </p>
        </div>

        {isComplete ? (
          <div className="space-y-4">
            <p className="text-sm text-arena-green leading-relaxed">
              Your password has been updated.
            </p>
            <a
              href="/"
              className="block w-full text-center py-3 rounded-xl font-medium text-sm bg-arena-charcoal dark:bg-arena-dark-text text-white dark:text-arena-dark-bg hover:bg-neutral-700 dark:hover:bg-arena-dark-text-muted transition-all"
            >
              Return to app
            </a>
          </div>
        ) : !hasRecoverySession ? (
          <p className="text-sm text-arena-text-muted dark:text-arena-dark-text-muted leading-relaxed">
            Waiting for your reset link to verify&hellip; if nothing happens, the link may have expired. Request a new one from the login screen.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col gap-3">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="new password"
                autoComplete="new-password"
                spellCheck={false}
                minLength={6}
                required
                className="w-full font-mono text-sm px-4 py-3 rounded-xl border bg-white dark:bg-arena-dark-surface border-arena-border dark:border-arena-dark-border text-arena-charcoal dark:text-arena-dark-text placeholder-arena-border dark:placeholder-arena-dark-border focus:outline-none focus:ring-2 focus:ring-arena-green/50 transition-colors"
              />
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                placeholder="confirm new password"
                autoComplete="new-password"
                spellCheck={false}
                minLength={6}
                required
                className="w-full font-mono text-sm px-4 py-3 rounded-xl border bg-white dark:bg-arena-dark-surface border-arena-border dark:border-arena-dark-border text-arena-charcoal dark:text-arena-dark-text placeholder-arena-border dark:placeholder-arena-dark-border focus:outline-none focus:ring-2 focus:ring-arena-green/50 transition-colors"
              />
            </div>

            {formError && (
              <p className="text-xs text-red-500 dark:text-red-400">{formError}</p>
            )}

            <button
              type="submit"
              disabled={!newPasswordInput.trim() || !confirmPasswordInput.trim() || isSubmitting}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all bg-arena-charcoal dark:bg-arena-dark-text text-white dark:text-arena-dark-bg hover:bg-neutral-700 dark:hover:bg-arena-dark-text-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Please wait...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
