/**
 * docUrl.js — Cloudinary document URL helper
 *
 * Strategy:
 *   - Legacy files were uploaded as resource_type: 'raw' → no transformations
 *     possible. Return the URL as-is. The browser will handle it (usually
 *     opens PDFs inline in modern browsers, or prompts download).
 *
 *   - New files are uploaded as resource_type: 'image' (see cloudinaryUpload.js).
 *     For these we can safely add fl_inline so PDFs open in-browser instead
 *     of downloading.
 *
 * IMPORTANT: Do NOT rewrite raw/upload → image/upload in the URL.
 * Cloudinary validates the resource type server-side. The rewrite causes HTTP 400.
 */

/**
 * Returns a URL that opens a document in the browser (inline) when possible.
 *
 * @param {string} url - Raw document URL from the database.
 * @returns {string}   - URL safe to use in a target="_blank" anchor.
 */
export function getViewableDocUrl(url) {
  if (!url) return '';

  // Non-Cloudinary URLs: return as-is
  if (!url.includes('res.cloudinary.com')) return url;

  // Legacy raw/upload URLs: return as-is — DO NOT rewrite to image/upload.
  // Cloudinary enforces resource types server-side; the rewrite causes 400.
  // Modern browsers will still attempt to open PDFs inline from raw URLs.
  if (url.includes('/raw/upload/')) {
    return url;
  }

  // image/upload URLs (new uploads via updated server): safely add fl_inline
  // so Content-Disposition is set to inline instead of attachment.
  if (url.includes('/image/upload/') && !url.includes('fl_inline')) {
    return url.replace('/image/upload/', '/image/upload/fl_inline/');
  }

  return url;
}

/**
 * Returns true if the URL points to a PDF file.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isPdfUrl(url) {
  if (!url) return false;
  return url.toLowerCase().split('?')[0].endsWith('.pdf');
}
