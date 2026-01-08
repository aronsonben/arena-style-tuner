
export interface ArenaBlock {
  id: number;
  title: string;
  image: {
    display: {
      url: string;
    };
    thumb: {
      url: string;
    };
    original: {
      url: string;
    }
  } | null;
  class: string;
}

export interface ArenaChannel {
  id: number;
  title: string;
  slug: string;
  contents: ArenaBlock[];
  metadata?: {
    description?: string;
    length?: number;
  }
}

export interface ProcessedImage {
  id: number;
  url: string;
  base64?: string;
  mimeType?: string;
  selected: boolean;
}

export enum AppState {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  IDLE = 'IDLE',
  LOADING_CHANNEL = 'LOADING_CHANNEL',
  SELECTING = 'SELECTING',
  PROCESSING_REFERENCES = 'PROCESSING_REFERENCES',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
