
import { ArenaChannel, ArenaBlock } from '../types';

const ARENA_API_BASE = 'https://api.are.na/v2';
const PROXY_PREFIX = 'https://corsproxy.io/?';
const PER_PAGE = 20;

export interface FetchBlocksResponse {
  contents: ArenaBlock[];
  hasMore: boolean;
}

/**
 * Fetches only the channel metadata (title, description, slug, etc.)
 */
export const fetchChannelMetadata = async (slug: string): Promise<ArenaChannel> => {
  const metaUrl = encodeURIComponent(`${ARENA_API_BASE}/channels/${slug}`);
  const metaResponse = await fetch(`${PROXY_PREFIX}${metaUrl}`);
  
  if (!metaResponse.ok) {
    if (metaResponse.status === 404) throw new Error('Channel not found.');
    if (metaResponse.status === 401) throw new Error('Private channel.');
    throw new Error('Failed to fetch channel metadata.');
  }

  const metaData = await metaResponse.json();
  return {
    id: metaData.id,
    title: metaData.title,
    slug: metaData.slug,
    contents: [], 
    metadata: {
      description: metaData.metadata?.description,
      length: metaData.length
    }
  };
};

/**
 * Fetches blocks for a specific page.
 */
export const fetchChannelBlocks = async (slug: string, page: number = 1): Promise<FetchBlocksResponse> => {
  const targetUrl = `${ARENA_API_BASE}/channels/${slug}/contents?page=${page}&per_page=${PER_PAGE}&direction=desc&sort=position`;
  const encodedUrl = encodeURIComponent(targetUrl);
  
  const response = await fetch(`${PROXY_PREFIX}${encodedUrl}`);

  if (!response.ok) {
    throw new Error('Failed to fetch channel contents.');
  }

  const data = await response.json();
  
  // The Are.na /contents endpoint returns an object with a "contents" array
  const rawContents = Array.isArray(data) ? data : data.contents;
  
  if (!Array.isArray(rawContents)) {
    console.error('Unexpected Are.na API response format:', data);
    throw new Error('Invalid response format from Are.na.');
  }

  const imageBlocks = rawContents.filter((block: ArenaBlock) => block.class === 'Image');

  return {
    contents: imageBlocks,
    // If the raw contents array (including non-images) is smaller than PER_PAGE, 
    // we've reached the end of the channel.
    hasMore: rawContents.length === PER_PAGE
  };
};

/**
 * Initial load helper to get first page + metadata.
 */
export const fetchChannelContents = async (slug: string): Promise<ArenaChannel> => {
  const channel = await fetchChannelMetadata(slug);
  const { contents } = await fetchChannelBlocks(slug, 1);
  
  return {
    ...channel,
    contents
  };
};
