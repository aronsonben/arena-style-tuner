
import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { 
  AppState, 
  ArenaChannel, 
  ProcessedImage 
} from './types';
import { extractChannelSlug, getImgBlobSize, urlToBase64 } from './services/utils';
import { fetchChannelMetadata, fetchChannelBlocks } from './services/arenaService';
import { generateStyledImage, fetchQuota } from './services/geminiService';
import { supabase } from './services/supabase';

// Components
import ChannelInput from './components/ChannelInput';
import ImageGrid from './components/ImageGrid';
import Controls from './components/Controls';
import OverlayModal, { ModalMode } from './components/OverlayModal';
import FriendGate from './components/FriendGate';
import AboutModal from './components/AboutModal';
import { AlertCircle, Moon, Sun, Shield } from 'lucide-react';
import { useLocalStorage } from './services/useLocalStorage';
import { trackEvent } from './services/analytics';
import { hasGeminiKey } from './services/supabase';
import LoginModal from './components/LoginModal';

const SELECTION_LIMIT = 10;
// In a real prod environment, this would be validated on a backend.
const SHARED_FRIEND_CODE = 'arena'; 

interface HeaderProps {
  channelTitle?: string;
  remaining: number | null;
  hasOwnKey: boolean;
  isDark: boolean;
  authUser: User | null;
  onReset: () => void;
  onOpenLoginModal: () => void;
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({
  channelTitle,
  remaining,
  hasOwnKey,
  isDark,
  authUser,
  onReset,
  onOpenLoginModal,
  onToggleTheme,
}) => (
  <header className={`fixed top-0 left-0 right-0 h-16 backdrop-blur-md border-b z-40 flex items-center px-6 justify-between transition-colors duration-300 bg-arena-cream/80 border-arena-border dark:bg-arena-dark-bg/80 dark:border-arena-dark-border`}>
    <div className="text-lg font-bold tracking-tight cursor-pointer transition-colors text-arena-charcoal dark:text-arena-dark-text" onClick={onReset}>
      Are.na <span className="font-normal text-arena-text-muted dark:text-arena-dark-text-muted">Synthesizer</span>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2 mb-0.5">
          {channelTitle && <div className="text-xs font-mono truncate max-w-37.5 sm:max-w-50 text-arena-text-muted dark:text-arena-dark-text-muted">{channelTitle}</div>}
        </div>
        <div className="text-[10px] font-mono opacity-70 flex items-center gap-3 text-arena-brown dark:text-arena-dark-text-muted">
          {hasOwnKey ? (
            <p title="Using your own API key" className="cursor-pointer text-arena-green" onClick={onOpenLoginModal}>OWN KEY ACTIVE</p>
          ) : remaining !== null && remaining <= 0 ? (
            <p title="Add your own API key to keep generating" className="cursor-pointer text-red-400" onClick={onOpenLoginModal}>ADD API KEY TO CONTINUE</p>
          ) : (
            <p title="Generations Remaining" className="cursor-pointer" onClick={onOpenLoginModal}>{remaining} GENS LEFT</p>
          )}
          <span className="h-2 w-px bg-arena-border dark:bg-arena-dark-border"></span>
          <button
            onClick={onOpenLoginModal}
            className={`uppercase ${authUser ? 'text-arena-green' : 'text-red-400'}`}
            title={authUser?.email ?? 'Not logged in'}
          >
            {authUser ? 'Logged In' : 'No User'}
          </button>
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
  const [quotaInfo, setQuotaInfo] = useState<{ remaining: number | null; hasOwnKey: boolean }>({ remaining: 2, hasOwnKey: false });
  const [authError, setAuthError] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [hasStoredKey, setHasStoredKey] = useState(false);

  /***** EFFECTS *************************************************** */
  /*******************************************************************/

  /** Load the server-enforced free-generation count on mount */
  useEffect(() => {
    updateQuotaDisplay();
    trackEvent('app_loaded');
  }, []);

  /** Track the current Supabase auth session, including on page load */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  /** Keep the BYOK connection status in sync with whichever account is signed in */
  useEffect(() => {
    if (!authUser) {
      setHasStoredKey(false);
      return;
    }
    hasGeminiKey().then(setHasStoredKey).catch(() => setHasStoredKey(false));
  }, [authUser]);

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
      setQuotaInfo({ remaining: 999, hasOwnKey: false });
      return; 
    }

    try {
      const { remaining, hasOwnKey } = await fetchQuota();
      setQuotaInfo({ remaining, hasOwnKey });
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

  /***** MISC. HANDLER FUNCS *********************************************** */
  /***************************************************************************/

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

  /***** ARENA FUNCS *********************************************** */
  /*******************************************************************/

  /** Load an are.na channel upon user input */
  const handleLoadChannel = async (url: string) => {
    setError(null);
    setGenError(null);
    setState(AppState.LOADING_CHANNEL);
    setCurrentPage(1);
    trackEvent('channel_load_started');

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
      trackEvent('channel_loaded', { channel_slug: slug, image_count: processed.length });
    } catch (err: any) {
      trackEvent('channel_load_failed', { reason: String(err.message || 'unknown').slice(0, 100) });
      setError(err.message || "Failed to load channel");
      setState(AppState.IDLE);
    }
  };

  /** Handler to load more images from the selected Are.na channel */
  const handleLoadMore = async () => {
    if (!channel || isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    trackEvent('load_more_images', { page: nextPage });

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
        trackEvent('selection_limit_hit');
        return prev;
      }
      
      if (error && error.includes('Maximum')) setError(null);

      target ? getImgBlobSize([target]) : null;        // log the blob size

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

    // Client-side gate for UX only; the server independently enforces this via the free-quota limiter.
    if (!hasStoredKey && quotaInfo.remaining !== null && quotaInfo.remaining <= 0) {
      setError('Free generation limit reached. Add your own Gemini API key to keep generating.');
      setShowLoginModal(true);
      return;
    }

    setState(AppState.PROCESSING_REFERENCES);
    setLastPrompt(prompt);
    trackEvent('generate_started', {
      selected_count: images.filter(img => img.selected).length,
      prompt_length: prompt.length,
      used_own_key: hasStoredKey,
    });

    try {
      const selectedImages = images.filter(img => img.selected);

      // getImgBlobSize(selectedImages);   // print the blob size for logging purposes

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
      
      setQuotaInfo({ remaining: result.remaining, hasOwnKey: result.remaining === null });
      
      setGeneratedImage(result.imageUrl);
      setState(AppState.COMPLETE);
      trackEvent('generate_succeeded', { remaining: result.remaining ?? undefined });

    } catch (err: any) {
      const errMsg = err.message || JSON.stringify(err);
      trackEvent('generate_failed', { reason: String(errMsg).slice(0, 100) });
      updateQuotaDisplay();
      if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED")) {
         setHasStoredKey(false);
         setError("Permission denied. Invalid API key. Please contact developer for further issues or return later.");
      } else {
         setGenError(err.message || "Generation failed.");
      }
      setState(AppState.SELECTING);
    }
  };

  /** Full reset of app state back to home */
  const handleReset = () => {
    trackEvent('reset');
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
      trackEvent('image_downloaded');
      const link = document.createElement('a');
      link.href = link.href = generatedImage;
      link.download = `arena-remix-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  /***** JSX RETURN CODE  ************************************************** */
  /***************************************************************************/

  return (
    <div className={`min-h-screen transition-colors duration-300 bg-arena-cream text-arena-charcoal dark:bg-arena-dark-bg dark:text-arena-dark-text`}>
      <Header
        channelTitle={channel?.title}
        remaining={quotaInfo.remaining}
        hasOwnKey={hasStoredKey}
        isDark={isDark}
        authUser={authUser}
        onReset={handleReset}
        onOpenLoginModal={() => setShowLoginModal(true)}
        onToggleTheme={() => {
          trackEvent('theme_toggled', { to: isDark ? 'light' : 'dark' });
          setIsDark(!isDark);
        }}
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
                onRetry={() => {
                  trackEvent('generate_retry');
                  handleGenerate(lastPrompt);
                }}
                onDownload={handleDownload}
              />
            )}
          </div>
        )}
      </main>

      <button
        onClick={() => {
          trackEvent('about_opened');
          setShowAbout(true);
        }}
        aria-label="About"
        title="About"
        className="fixed bottom-6 right-6 z-40 w-9 h-9 rounded-full border flex items-center justify-center text-sm font-mono transition-colors bg-arena-cream border-arena-border text-arena-charcoal hover:text-arena-green dark:bg-arena-dark-bg dark:border-arena-dark-border dark:text-arena-dark-text"
      >
        ?
      </button>

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      <LoginModal
        isOpen={showLoginModal}
        user={authUser}
        hasStoredKey={hasStoredKey}
        onHasStoredKeyChange={setHasStoredKey}
        onConnect={() => null}
        onDismiss={() => setShowLoginModal(false)}
        onDisconnect={() => null}
      />
    </div>
  );
};

export default App;
