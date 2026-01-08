
import React, { useState, useEffect } from 'react';
import { Download, X, AlertCircle, RotateCcw, Loader2 } from 'lucide-react';
import WaitingGames from './WaitingGames';

export type ModalMode = 'RESULT' | 'PROCESSING' | 'ERROR';

const PROCESSING_MESSAGES = [
  "Harvesting aesthetic artifacts...",
  "De-noising the channel signal...",
  "Warming up artistic intuition...",
  "Synthesizing visual syntax...",
  "Calibrating creative compass...",
  "Converting vibes to variables...",
  "Consulting the muse...",
  "Indexing reference textures...",
  "Drafting neural moodboards...",
  "Applying digital varnish...",
  "Extracting visual DNA...",
  "Translating pixels to poetry..."
];

interface OverlayModalProps {
  mode: ModalMode;
  imageUrl?: string | null;
  prompt?: string;
  errorMessage?: string | null;
  isProcessingReferences?: boolean;
  onClose: () => void;
  onRetry?: () => void;
  onDownload?: () => void;
}

const OverlayModal: React.FC<OverlayModalProps> = ({
  mode,
  imageUrl,
  prompt,
  errorMessage,
  isProcessingReferences,
  onClose,
  onRetry,
  onDownload
}) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (mode === 'PROCESSING') {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % PROCESSING_MESSAGES.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [mode]);

  // Determine styles and content based on mode
  const isError = mode === 'ERROR';
  const isProcessing = mode === 'PROCESSING';
  const isResult = mode === 'RESULT';

  const headerTitle = isError 
    ? "Generation Error" 
    : isProcessing 
      ? (isProcessingReferences ? 'Status: Indexing Signal' : 'Status: Synthesizing Output')
      : `Synthesized: ${prompt}`;

  const headerClass = isError 
    ? "text-red-500" 
    : isProcessing 
      ? "text-slate-500 dark:text-slate-400" 
      : "text-neutral-500";

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 ${
      isProcessing ? 'bg-slate-200/80 dark:bg-slate-950/90' : 'bg-white/95 dark:bg-neutral-950/95'
    }`}>
      <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border transition-all ${
        isProcessing 
          ? 'bg-white dark:bg-neutral-900 border-slate-300 dark:border-slate-800' 
          : 'bg-white dark:bg-neutral-900 border-arena-border dark:border-neutral-800'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b transition-colors ${
          isProcessing 
            ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800' 
            : 'bg-white dark:bg-neutral-900 border-arena-border dark:border-neutral-800'
        }`}>
          <h3 className={`font-mono text-xs uppercase tracking-widest truncate max-w-[75%] ${headerClass}`}>
            {headerTitle}
          </h3>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className={`p-2 rounded-full transition-colors ${
              isProcessing ? 'opacity-10 cursor-not-allowed' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className={`flex-1 flex flex-col items-center justify-center transition-all overflow-hidden ${
          isProcessing ? 'm-8 p-8 min-h-[50vh] rounded-xl animate-mesh relative' : 'p-4 bg-neutral-50 dark:bg-neutral-950'
        }`}>
          
          {isProcessing && (
            <>
              {/* Interactive Mini-Games */}
              {/* <WaitingGames /> */}

              {/* Noise overlay for processing mode */}
              <div className="absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-overlay z-0" 
                   style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
              />
              <div className="relative z-10 mb-8 pointer-events-none">
                <Loader2 className="w-12 h-12 text-blue-900/40 dark:text-blue-100/40 animate-spin" />
                <div className="absolute inset-0 w-12 h-12 bg-blue-400 rounded-full blur-2xl opacity-20 animate-pulse" />
              </div>
              <div className="relative z-10 space-y-3 text-center pointer-events-none">
                <h2 className="text-blue-950 dark:text-blue-50 text-2xl font-light tracking-tight">
                  {isProcessingReferences ? 'Analyzing References' : 'Generating Style'}
                </h2>
                <div className="h-6 flex items-center justify-center">
                  <p className="text-blue-900/60 dark:text-blue-200/60 font-mono text-[10px] uppercase tracking-[0.4em] animate-in slide-in-from-bottom-2 duration-700" key={messageIndex}>
                    {PROCESSING_MESSAGES[messageIndex]}
                  </p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-900/5 overflow-hidden pointer-events-none">
                <div className="h-full bg-blue-500/30 w-full animate-progress-shimmer" style={{
                  backgroundImage: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)',
                  backgroundSize: '200% 100%',
                }} />
              </div>
            </>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 mb-2">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-medium dark:text-white">Something went wrong</h2>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-sm leading-relaxed">
                  {errorMessage || "The synthesis process was interrupted. This can happen due to complex reference images or safety filters."}
                </p>
              </div>
            </div>
          )}

          {isResult && imageUrl && (
            <img 
              src={imageUrl} 
              alt="Generated Result" 
              className="max-w-full max-h-[60vh] object-contain shadow-lg rounded-lg animate-in zoom-in-95 duration-300"
            />
          )}
        </div>

        {/* Footer */}
        <div className={`p-6 border-t flex gap-4 transition-colors ${
          isProcessing ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-white dark:bg-neutral-900 border-arena-border dark:border-neutral-800'
        }`}>
          {isProcessing ? (
            <>
              <button disabled className="flex-1 flex items-center justify-center gap-2 bg-slate-200/50 dark:bg-slate-800 text-slate-400 py-3 rounded-xl font-medium cursor-not-allowed">
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </button>
              <button disabled className="px-6 py-3 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-300 dark:text-slate-600 cursor-not-allowed">
                Wait
              </button>
            </>
          ) : isError ? (
            <>
              <button
                onClick={onRetry}
                className="flex-1 flex items-center justify-center gap-2 bg-arena-text dark:bg-white text-white dark:text-black py-3 rounded-xl font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-lg"
              >
                <RotateCcw className="w-5 h-5" />
                Try Again
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 border border-arena-border dark:border-neutral-800 rounded-xl font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
              >
                Dismiss
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onDownload}
                className="flex-1 flex items-center justify-center gap-2 bg-arena-text dark:bg-white text-white dark:text-black py-3 rounded-xl font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-lg"
              >
                <Download className="w-5 h-5" />
                Download Image
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 border border-arena-border dark:border-neutral-800 rounded-xl font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes progress-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-progress-shimmer {
          animation: progress-shimmer 2s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default OverlayModal;
