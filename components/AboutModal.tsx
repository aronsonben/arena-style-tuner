import React from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        className="w-full max-w-md bg-arena-cream dark:bg-arena-dark-bg border border-arena-border dark:border-arena-dark-border rounded-2xl shadow-2xl p-8 space-y-4 text-center animate-in zoom-in-95 duration-200"
      >
        <h2 id="about-title" className="text-2xl font-light text-arena-charcoal dark:text-arena-dark-text">About</h2>
        <p className="text-sm text-arena-text-muted dark:text-arena-dark-text-muted leading-relaxed text-left">
          The Are.na style synthesizer is a hobby project exploring fine-tuning capabilites of Google's Nano Banana image generation LLM.
        </p>
        <p className="text-sm text-arena-text-muted dark:text-arena-dark-text-muted leading-relaxed text-left">
          The project is ongoing and intended for the use of fun! You may explore the code here: {' '}
          <a href="https://github.com/aronsonben/arena-style-tuner" target="_blank" rel="noreferrer" className="underline" >
            GitHub
          </a>.
        </p>
        <p className="text-sm text-arena-text-muted dark:text-arena-dark-text-muted leading-relaxed text-left">
          A project by {' '}
          <a href="https://concourse.codes" target="_blank" rel="noreferrer" className="underline hover:text-green-900" >
            Concourse Codes
          </a>. {' '}
        </p>
        <button
          onClick={onClose}
          className="text-xs font-mono uppercase hover:underline text-arena-charcoal dark:text-arena-dark-text"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AboutModal;
