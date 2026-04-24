import React, { useState } from 'react';
import { Key, Eye, EyeOff, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onConnect: (key: string) => void;
  onDismiss: () => void;
  onDisconnect?: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onConnect, onDismiss, onDisconnect }) => {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim()) {
      onConnect(keyInput.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <div className="w-full max-w-md bg-arena-cream dark:bg-arena-dark-bg border border-arena-border dark:border-arena-dark-border rounded-2xl shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">

        {/* Icon */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 bg-arena-beige dark:bg-arena-dark-surface rounded-2xl flex items-center justify-center">
            <Key className="w-7 h-7 text-arena-tan dark:text-arena-dark-text-muted" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-light text-arena-charcoal dark:text-arena-dark-text">
              Connect API Key
            </h2>
            <p className="text-sm text-arena-text-muted dark:text-arena-dark-text-muted leading-relaxed">
              A Gemini API key is required to generate images. You can still browse channels without one.
            </p>
          </div>
        </div>

        {/* Key input form */}
        <form onSubmit={handleSubmit} className="space-y-3">
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

          <button
            type="submit"
            disabled={!keyInput.trim()}
            className="w-full py-3 rounded-xl font-medium text-sm transition-all bg-arena-charcoal dark:bg-arena-dark-text text-white dark:text-arena-dark-bg hover:bg-neutral-700 dark:hover:bg-arena-dark-text-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Connect Key
          </button>
        </form>

        {/* Docs link */}
        <a
          href="https://ai.google.dev/gemini-api/docs/api-key"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs text-arena-text-muted dark:text-arena-dark-text-muted hover:text-arena-green transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          How to get a Gemini API key
        </a>

        {/* Dismiss */}
        <div className="text-center space-y-3">
          <button
            onClick={onDismiss}
            className="text-sm text-arena-text-muted dark:text-arena-dark-text-muted hover:text-arena-charcoal dark:hover:text-arena-dark-text transition-colors underline underline-offset-2"
          >
            Explore without a key →
          </button>
          {onDisconnect && (
            <div>
              <button
                onClick={onDisconnect}
                className="text-xs text-red-400 hover:text-red-600 transition-colors underline underline-offset-2"
              >
                Disconnect API Key
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
