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
    <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-white/60 via-white/20 to-transparent dark:from-neutral-950/60 dark:via-neutral-950/20 pointer-events-none z-50 transition-all">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl shadow-neutral-200/50 dark:shadow-black/50 border border-arena-border dark:border-neutral-800 p-2 md:p-3 flex flex-col gap-3">
          
          {/* Header / Reset */}
          <div className="flex items-center justify-between px-2 pt-1 md:hidden">
            <span className="text-xs font-mono text-neutral-400">{selectedCount} references</span>
            <button onClick={onReset} className="text-neutral-400 hover:text-red-500">
               <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="hidden md:flex items-center justify-center px-3 border-r border-arena-border dark:border-neutral-800">
               <button 
                type="button" 
                onClick={onReset}
                className="text-neutral-400 hover:text-red-500 transition-colors p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg"
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
              className="flex-1 bg-transparent px-3 py-3 outline-none text-base placeholder:text-neutral-300 dark:placeholder:text-neutral-600 font-medium dark:text-white"
            />
            
            <button
              type="submit"
              disabled={selectedCount === 0 || !prompt.trim() || isGenerating}
              className={`
                px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all
                ${selectedCount > 0 && prompt.trim() && !isGenerating
                  ? 'bg-arena-text dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-lg' 
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'}
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