/**
 * Extracts the channel slug from an Are.na URL.
 * Supports formats:
 * https://www.are.na/username/channel-slug
 * https://www.are.na/channel-slug
 * channel-slug
 */
export const extractChannelSlug = (input: string): string | null => {
  try {
    // If it's just a slug (no slashes), return it
    if (!input.includes('/') && !input.includes('.')) {
      return input;
    }

    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Case: /username/channel-slug
    if (pathSegments.length >= 2) {
      return pathSegments[pathSegments.length - 1];
    }
    // Case: /channel-slug
    if (pathSegments.length === 1) {
      return pathSegments[0];
    }

    return null;
  } catch (e) {
    // Fallback for non-standard inputs that might just be the slug but failed URL parsing
    const parts = input.split('/');
    return parts[parts.length - 1] || null;
  }
};

/**
 * Fetches an image from a URL and converts it to a Base64 string.
 * Uses a CORS proxy to avoid browser restrictions.
 */
export const urlToBase64 = async (url: string): Promise<{ base64: string; mimeType: string }> => {
  // Use a CORS proxy to fetch the image data
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      const mimeType = result.split(';')[0].split(':')[1];
      resolve({ base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
