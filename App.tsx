
import React, { useState, useEffect, useCallback } from 'react';
import { 
  AppState, 
  ArenaChannel, 
  ProcessedImage 
} from './types';
import { extractChannelSlug, urlToBase64 } from './services/utils';
import { fetchChannelMetadata, fetchChannelBlocks } from './services/arenaService';
import { generateStyledImage } from './services/geminiService';
import { RateLimitService } from './services/rateLimitService';

// Components
import ChannelInput from './components/ChannelInput';
import ImageGrid from './components/ImageGrid';
import Controls from './components/Controls';
import OverlayModal, { ModalMode } from './components/OverlayModal';
import FriendGate from './components/FriendGate';
import { AlertCircle, Key, Moon, Sun, Shield } from 'lucide-react';

const SELECTION_LIMIT = 10;
// In a real prod environment, this would be validated on a backend.
const SHARED_FRIEND_CODE = 'arena'; 

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.UNAUTHENTICATED);
  const [channel, setChannel] = useState<ArenaChannel | null>(null);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true); 
  const [quotaInfo, setQuotaInfo] = useState({ requests: 10, tokens: 50000 });
  const [authError, setAuthError] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [hasApiKey, setHasApiKey] = useState(!!process.env.API_KEY);

  useEffect(() => {
    // Check for existing session
    const savedCode = localStorage.getItem('arena_friend_code');
    if (savedCode === SHARED_FRIEND_CODE) {
      setState(AppState.IDLE);
    }

    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('bg-neutral-950', 'text-white');
      document.body.classList.remove('bg-white', 'text-arena-text');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('bg-white', 'text-arena-text');
      document.body.classList.remove('bg-neutral-950', 'text-white');
    }
  }, [isDark]);

  const updateQuotaDisplay = () => {
    const { remainingRequests, remainingTokens } = RateLimitService.checkLimit();
    setQuotaInfo({ requests: remainingRequests, tokens: remainingTokens });
  };

  useEffect(() => {
    updateQuotaDisplay();

    const checkApiKey = async () => {
      try {
        const win = window as any;
        if (win.aistudio && win.aistudio.hasSelectedApiKey) {
          const hasKey = await win.aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } else if (process.env.API_KEY) {
          setHasApiKey(true);
        }
      } catch (e) {
        console.error("Error checking API key status", e);
      }
    };
    checkApiKey();
  }, []);

  const handleUnlock = (code: string) => {
    if (code === SHARED_FRIEND_CODE) {
      localStorage.setItem('arena_friend_code', code);
      setAuthError(false);
      setState(AppState.IDLE);
    } else {
      setAuthError(true);
    }
  };

  const handleConnectApiKey = async () => {
    setError(null);
    try {
      const win = window as any;
      if (win.aistudio && win.aistudio.openSelectKey) {
        await win.aistudio.openSelectKey();
        setHasApiKey(true);
      } else if (process.env.API_KEY) {
        setHasApiKey(true);
      } else {
        setError("AI Studio environment not detected.");
      }
    } catch (e) {
      console.error("Error opening key selector", e);
      setError("Failed to open API key selector.");
    }
  };

  const handleLoadChannel = async (url: string) => {
    setError(null);
    setGenError(null);
    setState(AppState.LOADING_CHANNEL);
    setCurrentPage(1);

    try {
      const slug = extractChannelSlug(url);
      if (!slug) throw new Error("Invalid Are.na URL format");

      const channelData = await fetchChannelMetadata(slug);
      const { contents, hasMore } = await fetchChannelBlocks(slug, 1);
      
      const processed: ProcessedImage[] = contents.map((block) => ({
        id: block.id,
        url: block.image?.display.url || '',
        selected: false
      })).filter(img => img.url !== '');

      setChannel(channelData);
      setImages(processed);
      setHasMore(hasMore);
      setState(AppState.SELECTING);
    } catch (err: any) {
      setError(err.message || "Failed to load channel");
      setState(AppState.IDLE);
    }
  };

  const handleLoadMore = async () => {
    if (!channel || isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      const { contents, hasMore } = await fetchChannelBlocks(channel.slug, nextPage);
      
      const processed: ProcessedImage[] = contents.map((block) => ({
        id: block.id,
        url: block.image?.display.url || '',
        selected: false
      })).filter(img => img.url !== '');

      setImages(prev => [...prev, ...processed]);
      setCurrentPage(nextPage);
      setHasMore(hasMore);
    } catch (err: any) {
      console.error("Failed to load more blocks", err);
      setError("Failed to load more images.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleToggleSelect = useCallback((id: number) => {
    setImages(prev => {
      const currentSelectedCount = prev.filter(img => img.selected).length;
      const target = prev.find(img => img.id === id);
      
      if (target && !target.selected && currentSelectedCount >= SELECTION_LIMIT) {
        setError(`Maximum of ${SELECTION_LIMIT} images can be selected.`);
        return prev;
      }
      
      if (error && error.includes('Maximum')) setError(null);

      return prev.map(img => {
        if (img.id === id) return { ...img, selected: !img.selected };
        return img;
      });
    });
  }, [error]);

  const handleClearSelection = useCallback(() => {
    setImages(prev => prev.map(img => ({ ...img, selected: false })));
  }, []);

  const handleGenerate = async (prompt: string) => {
    setError(null);
    setGenError(null);
    const limit = RateLimitService.checkLimit();
    if (!limit.allowed) {
      setError(limit.reason || "Quota limit reached.");
      return;
    }

    setState(AppState.PROCESSING_REFERENCES);
    setLastPrompt(prompt);

    try {
      const selectedImages = images.filter(img => img.selected);
      
      const imagesWithBase64 = await Promise.all(
        selectedImages.map(async (img): Promise<ProcessedImage | null> => {
          try {
            const { base64, mimeType } = await urlToBase64(img.url);
            return { ...img, base64, mimeType };
          } catch (e) {
            return null;
          }
        })
      );

      const validImages = imagesWithBase64.filter((img): img is ProcessedImage => img !== null);
      if (validImages.length === 0) throw new Error("Could not process reference images.");

      setState(AppState.GENERATING);
      const result = await generateStyledImage(prompt, validImages);
      
      RateLimitService.recordUsage(result.promptTokens);
      updateQuotaDisplay();
      
      setGeneratedImage(result.imageUrl);
      setState(AppState.COMPLETE);

    } catch (err: any) {
      const errMsg = err.message || JSON.stringify(err);
      if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED")) {
         setHasApiKey(false);
         setError("Permission denied. Select a valid API key.");
      } else {
         setGenError(err.message || "Generation failed.");
      }
      setState(AppState.SELECTING);
    }
  };

  const handleReset = () => {
    setChannel(null);
    setImages([]);
    setGeneratedImage(null);
    setLastPrompt('');
    setError(null);
    setGenError(null);
    setCurrentPage(1);
    setHasMore(false);
    setState(AppState.IDLE);
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = link.href = generatedImage;
      link.download = `arena-remix-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getModalMode = (): ModalMode | null => {
    if (state === AppState.PROCESSING_REFERENCES || state === AppState.GENERATING) return 'PROCESSING';
    if (generatedImage) return 'RESULT';
    if (genError) return 'ERROR';
    return null;
  };

  const modalMode = getModalMode();

  if (state === AppState.UNAUTHENTICATED) {
    return <FriendGate onUnlock={handleUnlock} isError={authError} />;
  }

  if (!hasApiKey) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 ${isDark ? 'bg-neutral-950 text-white' : 'bg-white text-arena-text'} text-center animate-in fade-in`}>
        <div className="max-w-md space-y-6">
          <div className={`w-16 h-16 ${isDark ? 'bg-neutral-900' : 'bg-neutral-100'} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
            <Key className="w-8 h-8 text-neutral-400" />
          </div>
          <h1 className="text-3xl font-light">Connect Google AI</h1>
          <p className="text-neutral-500">To generate high-quality images with Gemini 3 Pro, you need to connect your API key.</p>
          <button onClick={handleConnectApiKey} className={`w-full py-4 rounded-xl font-medium transition-all ${isDark ? 'bg-white text-black hover:bg-neutral-200' : 'bg-arena-text text-white hover:bg-neutral-800'}`}>Connect Key</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-neutral-950 text-white' : 'bg-white text-arena-text'}`}>
      <header className={`fixed top-0 left-0 right-0 h-16 backdrop-blur-md border-b z-40 flex items-center px-6 justify-between transition-colors duration-300 ${isDark ? 'bg-neutral-950/80 border-neutral-800' : 'bg-white/80 border-arena-border'}`}>
        <div className={`text-lg font-bold tracking-tight cursor-pointer transition-colors ${isDark ? 'text-white' : 'text-arena-text'}`} onClick={handleReset}>
          Are.na <span className="font-normal text-neutral-400">Synthesizer</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-0.5">
              <Shield className="w-3 h-3 text-arena-green" />
              {channel && <div className="text-xs font-mono text-neutral-500 truncate max-w-[150px] sm:max-w-[200px]">{channel.title}</div>}
            </div>
            <div className="text-[10px] font-mono text-neutral-400 opacity-70 flex items-center gap-3">
              <span title="Daily Requests Remaining">{quotaInfo.requests} REQS</span>
              <span className="h-2 w-px bg-neutral-700"></span>
              <span title="Daily Token Quota Remaining">{(quotaInfo.tokens / 1000).toFixed(1)}K TOKENS</span>
              <span className="h-2 w-px bg-neutral-700"></span>
              <button 
                onClick={() => setIsDark(!isDark)}
                className="hover:text-arena-green transition-colors flex items-center gap-1"
                title="Toggle Theme"
              >
                {isDark ? <Sun className="w-3 h-3 text-white" /> : <Moon className="w-3 h-3" />}
                <span className={`uppercase ${isDark ? 'text-white' : ''}`}>{isDark ? 'Light' : 'Dark'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 px-4 md:px-8 max-w-7xl mx-auto min-h-screen pb-32">
        {error && (
          <div className={`mb-8 p-4 rounded-lg flex items-center gap-3 text-sm border ${isDark ? 'bg-red-950/30 text-red-400 border-red-900/50' : 'bg-red-50 text-red-600 border-red-100'}`}>
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
            <button onClick={() => setError(null)} className="ml-auto hover:underline">Dismiss</button>
          </div>
        )}

        {(state === AppState.IDLE || state === AppState.LOADING_CHANNEL) && (
          <div className="mt-20">
            <ChannelInput onLoad={handleLoadChannel} isLoading={state === AppState.LOADING_CHANNEL} />
          </div>
        )}

        {(state === AppState.SELECTING || state === AppState.PROCESSING_REFERENCES || state === AppState.GENERATING || state === AppState.COMPLETE) && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-8 space-y-2">
               <h2 className="text-2xl font-light">{channel?.title}</h2>
               {channel?.metadata?.description && <p className="text-neutral-500 max-w-2xl text-sm leading-relaxed">{channel.metadata.description}</p>}
            </div>

            <ImageGrid 
              images={images} 
              onToggleSelect={handleToggleSelect} 
              onClearSelection={handleClearSelection}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
              selectionLimit={SELECTION_LIMIT}
            />

            <Controls 
              selectedCount={images.filter(i => i.selected).length}
              onGenerate={handleGenerate}
              onReset={handleReset}
              isGenerating={state === AppState.GENERATING || state === AppState.PROCESSING_REFERENCES}
            />

            {modalMode && (
              <OverlayModal
                mode={modalMode}
                imageUrl={generatedImage}
                prompt={lastPrompt}
                errorMessage={genError}
                isProcessingReferences={state === AppState.PROCESSING_REFERENCES}
                onClose={() => {
                  setGeneratedImage(null);
                  setGenError(null);
                }}
                onRetry={() => handleGenerate(lastPrompt)}
                onDownload={handleDownload}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
