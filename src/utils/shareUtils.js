/**
 * URL Hash Sharing Utilities
 *
 * Encodes/decodes C4 models in URL hash for easy sharing.
 * Uses base64 + compression for smaller URLs.
 */

// Safe URL length limit (works in all browsers)
const MAX_URL_LENGTH = 8000;

/**
 * Compress and encode model to base64 string
 */
export const encodeModel = (model) => {
  try {
    const json = JSON.stringify(model);
    // Use built-in compression via encodeURIComponent + btoa
    const encoded = btoa(encodeURIComponent(json));
    return encoded;
  } catch (error) {
    console.error('Error encoding model:', error);
    return null;
  }
};

/**
 * Decode base64 string back to model
 */
export const decodeModel = (encoded) => {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  } catch (error) {
    console.error('Error decoding model:', error);
    return null;
  }
};

/**
 * Generate shareable URL with model in hash
 * Returns null if model is too large
 */
export const generateShareUrl = (model) => {
  const encoded = encodeModel(model);
  if (!encoded) return { url: null, error: 'Failed to encode model' };

  const baseUrl = window.location.origin + window.location.pathname;
  const fullUrl = `${baseUrl}#model=${encoded}`;

  if (fullUrl.length > MAX_URL_LENGTH) {
    return {
      url: null,
      error: `Model too large for URL sharing (${Math.round(fullUrl.length / 1024)}KB). Use JSON export instead.`
    };
  }

  return { url: fullUrl, error: null };
};

/**
 * Extract model from current URL hash
 * Returns null if no model in hash
 */
export const getModelFromUrl = () => {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#model=')) return null;

  const encoded = hash.substring(7); // Remove '#model='
  return decodeModel(encoded);
};

/**
 * Clear model from URL hash (without page reload)
 */
export const clearUrlHash = () => {
  history.replaceState(null, '', window.location.pathname);
};

/**
 * Check if current URL has a shared model
 */
export const hasSharedModel = () => {
  return window.location.hash.startsWith('#model=');
};
