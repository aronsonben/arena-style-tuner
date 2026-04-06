import React, { useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';

interface ControlsProps {
  selectedCount: number;
  onGenerate: (prompt: string) => void;
  onReset: () => void;
  isGenerating: boolean;
}

const Controls: React.FC<ControlsProps> = ({ selectedCount, onGenerate, onReset, isGenerating }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && selectedCount > 0) {
      onGenerate(prompt);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-arena-cream/60 via-arena-cream/20 to-transparent dark:from-arena-dark-bg/60 dark:via-arena-dark-bg/20 pointer-events-none z-50 transition-all">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div className="bg-arena-beige dark:bg-arena-dark-surface rounded-2xl shadow-2xl shadow-arena-border/30 dark:shadow-black/50 border border-arena-border dark:border-arena-dark-border p-2 md:p-3 flex flex-col gap-3">
          
          {/* Header / Reset */}
          <div className="flex items-center justify-between px-2 pt-1 md:hidden">
            <span className="text-xs font-mono text-arena-text-muted dark:text-arena-dark-text-muted">{selectedCount} references</span>
            <button onClick={onReset} className="text-arena-text-muted dark:text-arena-dark-text-muted hover:text-red-500">
               <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="hidden md:flex items-center justify-center px-3 border-r border-arena-border dark:border-arena-dark-border">
               <button 
                type="button" 
                onClick={onReset}
                className="text-arena-text-muted dark:text-arena-dark-text-muted hover:text-red-500 transition-colors p-2 hover:bg-arena-border-light dark:hover:bg-arena-dark-surface-elevated rounded-lg"
                title="Reset Channel"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={selectedCount > 0 ? "Describe what you want to generate..." : "Select images above first"}
              disabled={selectedCount === 0 || isGenerating}
              className="flex-1 bg-transparent px-3 py-3 outline-none text-base placeholder:text-arena-tan dark:placeholder:text-arena-dark-text-muted/60 font-medium text-arena-charcoal dark:text-arena-dark-text"
            />
            
            <button
              type="submit"
              disabled={selectedCount === 0 || !prompt.trim() || isGenerating}
              className={`
                px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all
                ${selectedCount > 0 && prompt.trim() && !isGenerating
                  ? 'bg-arena-charcoal dark:bg-arena-dark-text text-arena-cream dark:text-arena-dark-bg hover:bg-arena-text-dark dark:hover:bg-arena-beige shadow-lg' 
                  : 'bg-arena-border-light dark:bg-arena-dark-border text-arena-text-muted dark:text-arena-dark-text-muted/50 cursor-not-allowed'}
              `}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="hidden sm:inline">Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span className="hidden sm:inline">Generate</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Controls;