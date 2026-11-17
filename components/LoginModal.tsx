import React, { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ExternalLink, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { deleteGeminiKey, requestPasswordReset, saveGeminiKey, signInExistingUser, signOutUser, signUpNewUser } from '../services/supabase';

interface LoginModalProps {
  isOpen: boolean;
  user: User | null;
  hasStoredKey: boolean;
  onHasStoredKeyChange: (hasKey: boolean) => void;
  onConnect: (email: string) => void;
  onDismiss: () => void;
  onDisconnect?: () => void;
}

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, user, hasStoredKey, onHasStoredKeyChange, onConnect, onDismiss }) => {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [isEditingKey, setIsEditingKey] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isRemovingKey, setIsRemovingKey] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  if (!isOpen) return null;

  const closeKeyEditor = () => {
    setIsEditingKey(false);
    setShowKeyForm(false);
    setKeyInput('');
    setKeyError(null);
  };

  const handleSubmitKey = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setKeyError(null);
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setKeyError('That doesn\'t look like a valid Gemini API key.');
      return;
    }
    setIsSavingKey(true);
    try {
      const { error } = await saveGeminiKey(trimmed);
      if (error) throw error;
      onHasStoredKeyChange(true);
      closeKeyEditor();
    } catch (err: any) {
      setKeyError(err.message || 'Failed to save key. Please try again.');
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleRemoveKey = async () => {
    setKeyError(null);
    setIsRemovingKey(true);
    try {
      const { error } = await deleteGeminiKey();
      if (error) throw error;
      onHasStoredKeyChange(false);
      closeKeyEditor();
    } catch (err: any) {
      setKeyError(err.message || 'Failed to remove key. Please try again.');
    } finally {
      setIsRemovingKey(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setFormError(null);
    try {
      const { error } = await signOutUser();
      if (error) throw error;
      onDismiss();
    } catch (err: any) {
      setFormError(err.message || 'Failed to sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const resetFeedback = () => {
    setFormError(null);
    setConfirmationSent(false);
    setResetEmailSent(false);
  };

  const handleRequestReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    resetFeedback();
    setIsSubmitting(true);
    try {
      const { error } = await requestPasswordReset(emailInput);
      if (error) throw error;
      setResetEmailSent(true);
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    resetFeedback();
    setIsSubmitting(true);

    try {
      if (mode === 'sign-up') {
        const { data, error } = await signUpNewUser(emailInput, passwordInput);
        if (error) throw error;
        // email confirmation is required, so there's no session yet
        if (!data.session) {
          setConfirmationSent(true);
        } else {
          onConnect(emailInput);
        }
      } else {
        const { error } = await signInExistingUser(emailInput, passwordInput);
        if (error) throw error;
        onConnect(emailInput);
        onDismiss();
      }
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <div className="w-full max-w-md bg-arena-cream dark:bg-arena-dark-bg border border-arena-border dark:border-arena-dark-border rounded-2xl shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">

        {user ? (
          <>
            <div className="flex flex-col items-start gap-4 text-start">
              <div className="space-y-2">
                <h2 className="text-2xl font-light text-arena-charcoal dark:text-arena-dark-text">
                  Account
                </h2>
                <p className="text-sm text-arena-text-muted dark:text-arena-dark-text-muted leading-relaxed">
                  You're signed in to the Are.na Style Synthesizer
                </p>
              </div>
            </div>

            {/* User Info */}
            <div className="space-y-1 font-mono text-sm px-4 py-3 rounded-xl border bg-white dark:bg-arena-dark-surface border-arena-border dark:border-arena-dark-border text-arena-charcoal dark:text-arena-dark-text">
              <p>{user.email}</p>
              {user.created_at && (
                <p className="text-xs text-arena-text-muted dark:text-arena-dark-text-muted">
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* BYOK Status */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (isEditingKey) {
                    closeKeyEditor();
                  } else {
                    setIsEditingKey(true);
                    setShowKeyForm(!hasStoredKey);
                  }
                }}
                className="w-full flex items-center justify-between font-mono text-sm px-4 py-3 rounded-xl border bg-white dark:bg-arena-dark-surface border-arena-border dark:border-arena-dark-border text-arena-charcoal dark:text-arena-dark-text hover:border-arena-green transition-colors"
              >
                <span>Gemini API Key</span>
                <span className={`uppercase text-xs ${hasStoredKey ? 'text-arena-green' : 'text-red-400'}`}>
                  {hasStoredKey ? '✓ connected' : '✗ no'}
                </span>
              </button>

              {/* Gemini API Key Info */}
              <div className="flex items-center justify-between gap-2 px-1">
                <a
                  href="https://aistudio.google.com/docs/api-key"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-arena-text-muted dark:text-arena-dark-text-muted hover:text-arena-charcoal dark:hover:text-arena-dark-text underline underline-offset-2 transition-colors"
                >
                  Where do I get a Gemini API Key?
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowFaq(prev => !prev)}
                  aria-expanded={showFaq}
                  aria-label="Toggle API key FAQ"
                  className="text-arena-tan dark:text-arena-dark-text-muted hover:text-arena-charcoal dark:hover:text-arena-dark-text transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>

              <div
                aria-hidden={!showFaq}
                className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-in-out ${showFaq ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 invisible'}`}
              >
                <div className="overflow-hidden">
                <div className="space-y-3 px-1 text-xs text-arena-text-muted dark:text-arena-dark-text-muted leading-relaxed">
                  <div className="space-y-1">
                    <p className="font-medium text-arena-charcoal dark:text-arena-dark-text">Why do I need a Gemini API Key?</p>
                    <p>This app currently uses Google Gemini's image generation models to operate. In lieu of offering a paid tier, you may obtain a Gemini API key for use in the app (for free). Note that you may need to upgrade to a Billing Tier depending on your current Gemini API usage.</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-arena-charcoal dark:text-arena-dark-text">Is this secure?</p>
                    <p>
                      Yes. The system uses{' '}
                      <a
                        href="https://supabase.com/docs/guides/database/vault"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold underline underline-offset-2 hover:text-arena-charcoal dark:hover:text-arena-dark-text transition-colors"
                      >
                        Supabase Vault
                      </a>{' '}
                      to store the keys securely in the database. At no point is the key visible to the application.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-arena-charcoal dark:text-arena-dark-text">Can I just pay for credits instead?</p>
                    <p>
                      Not at the moment. Payment will be coming soon(ish). Feel free to {' '}
                      <a
                        href="mailto:ben@concourse.codes"
                        className="underline underline-offset-2 hover:text-arena-charcoal dark:hover:text-arena-dark-text transition-colors"
                      >
                        let me know
                      </a>
                      .
                    </p>
                  </div>
                </div>
                </div>
              </div>

              {isEditingKey && !showKeyForm && hasStoredKey && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyForm(true)}
                    className="w-full py-3 rounded-xl font-medium text-sm transition-colors border border-arena-border dark:border-arena-dark-border text-arena-charcoal dark:text-arena-dark-text hover:bg-arena-beige dark:hover:bg-arena-dark-surface"
                  >
                    Edit API Key
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveKey}
                    disabled={isRemovingKey}
                    className="w-full py-3 rounded-xl font-medium text-sm transition-colors border border-arena-border dark:border-arena-dark-border text-arena-charcoal dark:text-arena-dark-text hover:text-red-500 hover:border-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isRemovingKey ? 'Removing...' : 'Remove API Key'}
                  </button>
                </div>
              )}

              {isEditingKey && showKeyForm && (
                <form onSubmit={handleSubmitKey} className="space-y-3">
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="AIza..."
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full font-mono text-sm px-4 py-3 pr-12 rounded-xl border bg-white dark:bg-arena-dark-surface border-arena-border dark:border-arena-dark-border text-arena-charcoal dark:text-arena-dark-text placeholder-arena-border dark:placeholder-arena-dark-border focus:outline-none focus:ring-2 focus:ring-arena-green/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-arena-tan dark:text-arena-dark-text-muted hover:text-arena-charcoal dark:hover:text-arena-dark-text transition-colors"
                      tabIndex={-1}
                      aria-label={showKey ? 'Hide key' : 'Show key'}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {keyError && (
                    <p className="text-xs text-red-500 dark:text-red-400">{keyError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={!keyInput.trim() || isSavingKey}
                    className="w-full py-3 rounded-xl font-medium text-sm transition-all bg-arena-charcoal dark:bg-arena-dark-text text-white dark:text-arena-dark-bg hover:bg-neutral-700 dark:hover:bg-arena-dark-text-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSavingKey ? 'Saving...' : 'Save Key'}
                  </button>
                </form>
              )}
            </div>

            {formError && (
              <p className="text-xs text-red-500 dark:text-red-400">{formError}</p>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all bg-arena-charcoal dark:bg-arena-dark-text text-white dark:text-arena-dark-bg hover:bg-neutral-700 dark:hover:bg-arena-dark-text-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </>
        ) : (
        <>
        {/* Icon */}
        <div className="flex flex-col items-start gap-4 text-start">
          <div className="space-y-2">
            <h2 className="text-2xl font-light text-arena-charcoal dark:text-arena-dark-text">
              {mode === 'sign-up' ? 'Sign Up' : mode === 'forgot-password' ? 'Reset Password' : 'Login'}
            </h2>
            <p className="text-sm text-arena-text-muted dark:text-arena-dark-text-muted leading-relaxed">
              {mode === 'forgot-password'
                ? "Enter your email and we'll send you a reset link."
                : 'Create an account or sign-in to use more of the Are.na Style Synthesizer'}
            </p>
          </div>
        </div>

        {mode === 'forgot-password' ? (
          resetEmailSent ? (
            <p className="text-sm text-arena-green leading-relaxed">
              If an account exists for <span className="font-mono">{emailInput}</span>, a reset link is on its way.
            </p>
          ) : (
            <>
              <form onSubmit={handleRequestReset} className="space-y-3">
                <div className="relative flex flex-col gap-3">
                  <label htmlFor="reset-email">Email</label>
                  <input
                    id="reset-email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="coolio@gmail.com"
                    autoComplete="email"
                    spellCheck={false}
                    required
                    className="w-full font-mono text-sm px-4 py-3 pr-12 rounded-xl border bg-white dark:bg-arena-dark-surface border-arena-border dark:border-arena-dark-border text-arena-charcoal dark:text-arena-dark-text placeholder-arena-border dark:placeholder-arena-dark-border focus:outline-none focus:ring-2 focus:ring-arena-green/50 transition-colors"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-red-500 dark:text-red-400">{formError}</p>
                )}

                <button
                  type="submit"
                  disabled={!emailInput.trim() || isSubmitting}
                  className="w-full py-3 rounded-xl font-medium text-sm transition-all bg-arena-charcoal dark:bg-arena-dark-text text-white dark:text-arena-dark-bg hover:bg-neutral-700 dark:hover:bg-arena-dark-text-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Please wait...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { resetFeedback(); setMode('sign-in'); }}
                  className="text-sm text-arena-text-muted dark:text-arena-dark-text-muted hover:text-arena-charcoal dark:hover:text-arena-dark-text transition-colors underline underline-offset-2"
                >
                  Back to sign in
                </button>
              </div>
            </>
          )
        ) : confirmationSent ? (
          <p className="text-sm text-arena-green leading-relaxed">
            Check your inbox at <span className="font-mono">{emailInput}</span> to confirm your account before signing in.
          </p>
        ) : (
          <>
            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative flex flex-col gap-3">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="coolio@gmail.com"
                  autoComplete="email"
                  spellCheck={false}
                  required
                  className="w-full font-mono text-sm px-4 py-3 pr-12 rounded-xl border bg-white dark:bg-arena-dark-surface border-arena-border dark:border-arena-dark-border text-arena-charcoal dark:text-arena-dark-text placeholder-arena-border dark:placeholder-arena-dark-border focus:outline-none focus:ring-2 focus:ring-arena-green/50 transition-colors"
                />
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="password"
                  autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                  spellCheck={false}
                  minLength={6}
                  required
                  className="w-full font-mono text-sm px-4 py-3 pr-12 rounded-xl border bg-white dark:bg-arena-dark-surface border-arena-border dark:border-arena-dark-border text-arena-charcoal dark:text-arena-dark-text placeholder-arena-border dark:placeholder-arena-dark-border focus:outline-none focus:ring-2 focus:ring-arena-green/50 transition-colors"
                />
              </div>

              {mode === 'sign-in' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { resetFeedback(); setMode('forgot-password'); }}
                    className="text-xs text-arena-text-muted dark:text-arena-dark-text-muted hover:text-arena-charcoal dark:hover:text-arena-dark-text transition-colors underline underline-offset-2"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {formError && (
                <p className="text-xs text-red-500 dark:text-red-400">{formError}</p>
              )}

              <button
                type="submit"
                disabled={!emailInput.trim() || !passwordInput.trim() || isSubmitting}
                className="w-full py-3 rounded-xl font-medium text-sm transition-all bg-arena-charcoal dark:bg-arena-dark-text text-white dark:text-arena-dark-bg hover:bg-neutral-700 dark:hover:bg-arena-dark-text-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Please wait...' : mode === 'sign-up' ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  resetFeedback();
                  setMode(prev => (prev === 'sign-in' ? 'sign-up' : 'sign-in'));
                }}
                className="text-sm text-arena-text-muted dark:text-arena-dark-text-muted hover:text-arena-charcoal dark:hover:text-arena-dark-text transition-colors underline underline-offset-2"
              >
                {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </>
        )}
        </>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
