
import { ArenaChannel, ArenaBlock } from '../types';

const ARENA_API_BASE = 'https://api.are.na/v3';
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
  // const metaUrl = encodeURIComponent(`${ARENA_API_BASE}/channels/${slug}`);
  // const metaResponse = await fetch(`${PROXY_PREFIX}${metaUrl}`);
  const metaUrl = `${ARENA_API_BASE}/channels/${slug}`;
  const metaResponse = await fetch(`${metaUrl}`);
  
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
  const targetUrl = `${ARENA_API_BASE}/channels/${slug}/contents?page=${page}&per=${PER_PAGE}&sort=position_desc`;
  // const encodedUrl = encodeURIComponent(targetUrl);
  // const response = await fetch(`${PROXY_PREFIX}${encodedUrl}`);
  const response = await fetch(`${targetUrl}`);

  if (!response.ok) {
    throw new Error('Failed to fetch channel contents.');
  }

  const responseJson = await response.json();
  
  // The Are.na v3 API /contents endpoint returns: (1) 'data' array of blocks, (2) 'meta' object
  if (!responseJson.data || !responseJson.meta) {
    throw new Error('Failed to fetch channel contents.');
  }

  // console.log(responseJson);

  const {data, meta} = responseJson;

  if (!Array.isArray(data)) {
    console.error('Unexpected Are.na API response format:', data);
    throw new Error('Invalid response format from Are.na.');
  } 
  
  const imageBlocks = data.filter((block) => block.type === 'Image');

  // console.log("Found image blocks: ", imageBlocks);

  return {
    contents: imageBlocks,
    // If the raw contents array (including non-images) is smaller than PER_PAGE, 
    // we've reached the end of the channel.
    hasMore: meta.has_more_pages
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
