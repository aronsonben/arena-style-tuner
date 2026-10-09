
import React, { useState, useEffect, useCallback } from 'react';
import { 
  AppState, 
  ArenaChannel, 
  ProcessedImage 
} from './types';
import { extractChannelSlug, urlToBase64 } from './services/utils';
import { fetchChannelMetadata, fetchChannelBlocks } from './services/arenaService';
import { generateStyledImage, fetchQuota } from './services/geminiService';

// Components
import ChannelInput from './components/ChannelInput';
import ImageGrid from './components/ImageGrid';
import Controls from './components/Controls';
import OverlayModal, { ModalMode } from './components/OverlayModal';
import FriendGate from './components/FriendGate';
import ApiKeyModal from './components/ApiKeyModal';
import { AlertCircle, Moon, Sun, Shield } from 'lucide-react';
import { useLocalStorage } from './services/useLocalStorage';

const SELECTION_LIMIT = 10;
// In a real prod environment, this would be validated on a backend.
const SHARED_FRIEND_CODE = 'arena'; 

interface HeaderProps {
  hasApiKey: boolean;
  channelTitle?: string;
  remaining: number;
  isDark: boolean;
  onReset: () => void;
  onOpenApiKeyModal: () => void;
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({
  hasApiKey,
  channelTitle,
  remaining,
  isDark,
  onReset,
  onOpenApiKeyModal,
  onToggleTheme,
}) => (
  <header className={`fixed top-0 left-0 right-0 h-16 backdrop-blur-md border-b z-40 flex items-center px-6 justify-between transition-colors duration-300 bg-arena-cream/80 border-arena-border dark:bg-arena-dark-bg/80 dark:border-arena-dark-border`}>
    <div className="text-lg font-bold tracking-tight cursor-pointer transition-colors text-arena-charcoal dark:text-arena-dark-text" onClick={onReset}>
      Are.na <span className="font-normal text-arena-text-muted dark:text-arena-dark-text-muted">Synthesizer</span>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2 mb-0.5">
          {/* {hasApiKey ? (
            <button
              onClick={onOpenApiKeyModal}
              title="Edit API key"
              className="text-[10px] font-mono flex items-center gap-1 text-arena-green hover:text-arena-tan transition-colors cursor-pointer group"
            >
              <span className="group-hover:hidden">✓ API KEY</span>
              <span className="hidden group-hover:inline">EDIT API KEY</span>
            </button>
          ) : (
            <button
              onClick={onOpenApiKeyModal}
              title="Add API key"
              className="text-[10px] font-mono flex items-center gap-1 text-red-400 hover:text-arena-green transition-colors cursor-pointer"
            >
              ✗ API KEY
            </button>
          )}
          <Shield className="w-3 h-3 text-arena-green" /> */}
          {channelTitle && <div className="text-xs font-mono truncate max-w-37.5 sm:max-w-50 text-arena-text-muted dark:text-arena-dark-text-muted">{channelTitle}</div>}
        </div>
        <div className="text-[10px] font-mono opacity-70 flex items-center gap-3 text-arena-brown dark:text-arena-dark-text-muted">
          <span title="Generations Remaining">{remaining} GENS LEFT</span>
          <span className="h-2 w-px bg-arena-border dark:bg-arena-dark-border"></span>
          <button
            onClick={onToggleTheme}
            className="hover:text-arena-green transition-colors flex items-center gap-1"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            <span className="uppercase text-arena-charcoal dark:text-arena-dark-text">{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>
    </div>
  </header>
);

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.UNAUTHENTICATED);
  const [isDark, setIsDark] = useLocalStorage<boolean>('arena-dark-theme', true); 

  const [channel, setChannel] = useState<ArenaChannel | null>(null);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState({ remaining: 5 });
  const [authError, setAuthError] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // const [hasApiKey, setHasApiKey] = useState(!!process.env.API_KEY);
  const [hasApiKey, setHasApiKey] = useLocalStorage<boolean>('arena-has-api-key', false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string | null>(null);  // TODO: need to fix this omg!

  /***** EFFECTS *************************************************** */
  /*******************************************************************/

  /** Load the server-enforced free-generation count on mount */
  useEffect(() => {
    updateQuotaDisplay();
  }, []);

  /** Check for existing session and handle dark mode */
  useEffect(() => {
    // TODO: eventually remove all friend gate logic
    // Check for existing session
    const savedCode = localStorage.getItem('arena_friend_code');
    if (savedCode === SHARED_FRIEND_CODE) {
      setState(AppState.IDLE);
    }

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const updateQuotaDisplay = async () => {
    // if DEV qutoa is irrelevant
    if (process.env.NODE_ENV === 'development') {
      setQuotaInfo({ remaining: 999 });
      return; 
    }

    try {
      const { remaining } = await fetchQuota();
      setQuotaInfo({ remaining });
    } catch (e) {
      console.warn('Failed to load quota', e);
    }
  };

  /** handle friend-gate unlock */
  const handleUnlock = (code: string) => {
    if (code === SHARED_FRIEND_CODE) {
      localStorage.setItem('arena_friend_code', code);
      setAuthError(false);
      setState(AppState.IDLE);
    } else {
      setAuthError(true);
    }
  };

  /***** ARENA FUNCS *********************************************** */
  /*******************************************************************/

  /** Load an are.na channel upon user input */
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
        url: block.image?.medium.src || '',  // arbitrarily picked medium from v3 api
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

  /** Handler to load more images from the selected Are.na channel */
  const handleLoadMore = async () => {
    if (!channel || isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      const { contents, hasMore } = await fetchChannelBlocks(channel.slug, nextPage);
      
      const processed: ProcessedImage[] = contents.map((block) => ({
        id: block.id,
        url: block.image?.medium.src || '',
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

  /** Toggle an image to be selected & included in fine-tuning */
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

  /** Clear all toggled-on images from selection */
  const handleClearSelection = useCallback(() => {
    setImages(prev => prev.map(img => ({ ...img, selected: false })));
  }, []);

  /** Generate an image from a prompt & selected images */
  const handleGenerate = async (prompt: string) => {
    setError(null);
    setGenError(null);

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
      const result = await generateStyledImage(prompt, validImages, userApiKey ?? undefined);
      
      setQuotaInfo({ remaining: result.remaining });
      
      setGeneratedImage(result.imageUrl);
      setState(AppState.COMPLETE);

    } catch (err: any) {
      const errMsg = err.message || JSON.stringify(err);
      updateQuotaDisplay();
      if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED")) {
         setHasApiKey(false);
         setError("Permission denied. Invalid API key. Please contact developer for further issues or return later.");
      } else {
         setGenError(err.message || "Generation failed.");
      }
      setState(AppState.SELECTING);
    }
  };

  /** Full reset of app state back to home */
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

  /** Handle download of image after generation */
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

  /** Modal switch handler */
  const getModalMode = (): ModalMode | null => {
    if (state === AppState.PROCESSING_REFERENCES || state === AppState.GENERATING) return 'PROCESSING';
    if (generatedImage) return 'RESULT';
    if (genError) return 'ERROR';
    return null;
  };

  const modalMode = getModalMode();

  // Removing friend gate but leaving deprecated during cloud infra migration (oct. 9, 2026)
  // if (state === AppState.UNAUTHENTICATED) {
  //   return <FriendGate onUnlock={handleUnlock} isError={authError} />;
  // }

  return (
    <div className={`min-h-screen transition-colors duration-300 bg-arena-cream text-arena-charcoal dark:bg-arena-dark-bg dark:text-arena-dark-text`}>
      <Header
        hasApiKey={hasApiKey}
        channelTitle={channel?.title}
        remaining={quotaInfo.remaining}
        isDark={isDark}
        onReset={handleReset}
        onOpenApiKeyModal={() => setShowApiKeyModal(true)}
        onToggleTheme={() => setIsDark(!isDark)}
      />

      <main className="pt-24 px-4 md:px-8 max-w-7xl mx-auto min-h-screen pb-32">
        {error && (
          <div className="mb-8 p-4 rounded-lg flex items-center gap-3 text-sm border bg-red-50/80 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
            <button onClick={() => setError(null)} className="ml-auto hover:underline font-medium">Dismiss</button>
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
               <h2 className="text-2xl font-light text-arena-charcoal dark:text-arena-dark-text">{channel?.title}</h2>
               {channel?.metadata?.description && <p className="max-w-2xl text-sm leading-relaxed text-arena-text-muted dark:text-arena-dark-text-muted">{channel.metadata.description}</p>}
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

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onConnect={() => null}
        onDismiss={() => setShowApiKeyModal(false)}
        onDisconnect={() => null}
      />
    </div>
  );
};

export default App;
