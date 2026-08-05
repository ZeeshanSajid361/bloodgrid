/**
 * docUrl.js — Document URL utilities
 *
 * Routes document links through our server-side proxy (/api/docs/view).
 * The proxy fetches the file from Cloudinary and re-serves it with:
 *   Content-Type: application/pdf
 *   Content-Disposition: inline
 *
 * This guarantees the browser renders the PDF in a new tab regardless of
 * how Cloudinary originally stored it (raw, image, etc.).
 */

const rawUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const API_BASE = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

/**
 * Returns a URL that opens the document inline in the browser.
 *   - PDFs   → routed through our server proxy (forces inline rendering)
 *   - Images → original URL (browsers render images natively)
 *
 * @param {string} url - Raw document URL from the database.
 * @returns {string}
 */
export function getViewableDocUrl(url) {
  if (!url) return '';

  if (isPdfUrl(url)) {
    // Route through server proxy which sets Content-Disposition: inline
    return `${API_BASE}/docs/view?url=${encodeURIComponent(url)}`;
  }

  // Images open fine directly
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
