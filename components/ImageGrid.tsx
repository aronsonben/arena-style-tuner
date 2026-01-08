import React from 'react';
import { ProcessedImage } from '../types';
import { Check, Image as ImageIcon, Plus, Loader2, Trash2 } from 'lucide-react';

interface ImageGridProps {
  images: ProcessedImage[];
  onToggleSelect: (id: number) => void;
  onClearSelection: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  selectionLimit: number;
}

const ImageGrid: React.FC<ImageGridProps> = ({ 
  images, 
  onToggleSelect, 
  onClearSelection,
  hasMore, 
  isLoadingMore, 
  onLoadMore,
  selectionLimit
}) => {
  const selectedCount = images.filter(i => i.selected).length;

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
        <p>No images found in this channel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sticky Selection Status Bar with pop of color */}
      <div className="flex items-center justify-between sticky top-[64px] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md z-30 py-4 px-4 -mx-4 border-y border-arena-border dark:border-indigo-500/20 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-neutral-500 dark:text-indigo-400/80 uppercase tracking-[0.15em] font-semibold">
            Style References
          </span>
          <div className="hidden sm:block h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          <span className="hidden sm:inline text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase">
            Max {selectionLimit} images
          </span>
        </div>
        
        <div className="flex items-center gap-3">
           {selectedCount > 0 && (
             <button 
              onClick={(e) => {
                e.stopPropagation();
                onClearSelection();
              }}
              className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-neutral-400 hover:text-red-500 transition-colors py-1.5 px-3 rounded-lg hover:bg-red-500/5"
             >
               <Trash2 className="w-3 h-3" />
               <span className="hidden sm:inline">Clear selection</span>
             </button>
           )}

           <div className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all flex items-center gap-2 shadow-sm
             ${selectedCount >= selectionLimit 
               ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800' 
               : 'bg-arena-text dark:bg-indigo-600 dark:text-white text-white shadow-indigo-500/10'}
           `}>
             <span className="font-mono">{selectedCount}</span>
             <span className="opacity-40">/</span>
             <span className="font-mono">{selectionLimit}</span>
             <span className="text-[10px] uppercase tracking-tighter opacity-70 ml-1">Selected</span>
           </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-4">
        {images.map((img) => (
          <div
            key={img.id}
            onClick={() => onToggleSelect(img.id)}
            className={`
              relative group aspect-square cursor-pointer overflow-hidden rounded-md border transition-all duration-200
              ${img.selected 
                ? 'border-arena-green ring-2 ring-arena-green ring-offset-2 dark:ring-offset-neutral-950' 
                : 'border-arena-border dark:border-neutral-800 hover:border-arena-text dark:hover:border-neutral-400'
              }
            `}
          >
            <img
              src={img.url}
              alt=""
              className={`w-full h-full object-cover transition-transform duration-500 ${img.selected ? 'scale-105' : 'group-hover:scale-105'}`}
              loading="lazy"
            />
            
            {/* Overlay */}
            <div className={`
              absolute inset-0 transition-opacity duration-200 flex items-center justify-center
              ${img.selected ? 'bg-arena-green/10 opacity-100' : 'bg-black/0 opacity-0 group-hover:opacity-100'}
            `}>
              {img.selected && (
                <div className="bg-arena-green text-white p-2 rounded-full shadow-lg transform scale-100 transition-transform">
                  <Check className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-8 pb-12">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 px-8 py-3 border border-arena-border dark:border-neutral-800 rounded-xl font-mono text-sm hover:border-arena-text dark:hover:border-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                <span>Loading contents...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                <span>Load more blocks</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageGrid;