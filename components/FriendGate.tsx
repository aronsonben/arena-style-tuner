
import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';

interface FriendGateProps {
  onUnlock: (code: string) => void;
  isError?: boolean;
}

const FriendGate: React.FC<FriendGateProps> = ({ onUnlock, isError }) => {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUnlock(code);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white dark:bg-neutral-950 flex items-center justify-center p-6 animate-in fade-in duration-500">
      {/* Background Mesh */}
      <div className="absolute inset-0 opacity-20 dark:opacity-40 pointer-events-none animate-mesh bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 blur-3xl" />
      
      <div className="relative w-full max-w-sm space-y-8 text-center">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-arena-text dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center mx-auto shadow-2xl rotate-3 hover:rotate-0 transition-transform">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-light tracking-tight text-arena-text dark:text-white">
              Restricted Access
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm font-mono">
              Please enter your friend code to continue.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••••"
              className={`
                w-full px-6 py-4 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl border rounded-2xl text-center text-xl outline-none transition-all font-mono
                ${isError 
                  ? 'border-red-500 ring-4 ring-red-500/10' 
                  : 'border-neutral-200 dark:border-neutral-800 focus:border-arena-text dark:focus:border-white'
                }
              `}
              autoFocus
            />
            <button
              type="submit"
              disabled={!code}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-arena-text dark:bg-white text-white dark:text-black rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-transform"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          
          {isError && (
            <p className="text-red-500 text-xs font-mono animate-in slide-in-from-top-1">
              Invalid access code. Please try again.
            </p>
          )}
        </form>

        <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-neutral-400 uppercase tracking-widest pt-8">
          <ShieldCheck className="w-3 h-3" />
          <span>Secured for private beta</span>
        </div>
      </div>
    </div>
  );
};

export default FriendGate;
