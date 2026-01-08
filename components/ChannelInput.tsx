
import React, { useState } from 'react';
import { ArrowRight, Paintbrush, Loader2 } from 'lucide-react';

interface ChannelInputProps {
  onLoad: (url: string) => void;
  isLoading: boolean;
}

const RECOMMENDATIONS = [
  "https://www.are.na/evan-collins-1522646491/gen-x-soft-club",
  "https://www.are.na/renald-louissaint/so-like-all-green-but-then-a-pop-of-red",
  "https://www.are.na/christina/album-art-zkod2_q2v64"
];

const ChannelInput: React.FC<ChannelInputProps> = ({ onLoad, isLoading }) => {
  const [input, setInput] = useState('');
  const [showRecs, setShowRecs] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim()) {
      onLoad(input);
    }
  };

  const handleRecClick = (url: string) => {
    setInput(url);
    // Use a small timeout to ensure the input state is updated before submission
    setTimeout(() => {
      onLoad(url);
    }, 10);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-light tracking-tight text-arena-text dark:text-white transition-colors">
          Are.na Style Synthesizer
        </h1>
        <p className="text-neutral-500 font-mono text-sm">
          Fine-tune Gemini on your favorite channels.
        </p>
      </div>

      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="relative group">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://are.na/username/channel-name"
              className="w-full px-6 py-4 bg-white dark:bg-neutral-900 border border-arena-border dark:border-neutral-800 rounded-xl text-lg outline-none focus:ring-2 focus:ring-arena-text/10 focus:border-arena-text dark:focus:border-white transition-all placeholder:text-neutral-300 dark:placeholder:text-gray-500 font-mono text-black dark:text-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-2 bg-arena-text dark:bg-white text-white dark:text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <ArrowRight className="w-6 h-6" />
              )}
            </button>
          </div>
        </form>

        <div className="flex flex-col items-center gap-3">
          <button 
            onClick={() => setShowRecs(!showRecs)}
            className="flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-arena-green transition-colors group"
          >
            <Paintbrush className="w-3 h-3 group-hover:rotate-12 transition-transform" />
            <span>Need inspiration? Try these channels</span>
          </button>

          {showRecs && (
            <div className="flex flex-col gap-2 w-full max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
              {RECOMMENDATIONS.map((url, idx) => (
                <button
                  key={`${url}-${idx}`}
                  onClick={() => handleRecClick(url)}
                  disabled={isLoading}
                  className={`
                    text-left px-4 py-2 text-[10px] font-mono border rounded-lg transition-all
                    bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800
                    hover:border-arena-green hover:text-arena-green dark:hover:border-arena-green
                    truncate max-w-full animate-in fade-in slide-in-from-top-1
                  `}
                  style={{ animationDelay: `${idx * 75}ms`, animationFillMode: 'both' }}
                >
                  {url}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4 text-xs text-neutral-400 font-mono">
          <span>Public channels only</span>
          <span>•</span>
          <span>Images only</span>
        </div>
      </div>
    </div>
  );
};

export default ChannelInput;
