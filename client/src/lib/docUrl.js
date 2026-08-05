/**
 * docUrl.js — Document URL utilities
 *
 * Problem: Cloudinary serves PDFs either as attachment (raw type — downloads)
 * or returns HTTP 400 for invalid transformation flags (image type).
 * There is no reliable Cloudinary-native way to force inline PDF rendering
 * for both old (raw) and new (image) resource types simultaneously.
 *
 * Solution: Route PDFs through Google Docs Viewer.
 *   URL format: https://docs.google.com/viewer?url=<encoded-url>
 *
 * This works with ANY publicly accessible URL — Cloudinary raw, image, S3, etc.
 * Google's servers fetch and render the PDF natively in the browser tab.
 * No backend changes needed. Free. Reliable. Used by many production apps.
 *
 * For images (non-PDF), open the original Cloudinary URL directly.
 */

const GOOGLE_VIEWER = 'https://docs.google.com/viewer?url=';

/**
 * Returns a URL that will open the document in the browser.
 *   - PDFs   → wrapped in Google Docs Viewer (opens inline in new tab)
 *   - Images → original URL (browsers render images natively)
 *
 * @param {string} url - Raw document URL from the database.
 * @returns {string}   - URL safe to use in a target="_blank" anchor.
 */
export function getViewableDocUrl(url) {
  if (!url) return '';

  if (isPdfUrl(url)) {
    // Use Google Docs Viewer to render PDF inline in new tab.
    // Works for any publicly accessible URL regardless of resource type.
    return `${GOOGLE_VIEWER}${encodeURIComponent(url)}`;
  }

  // Non-PDF (images, etc.) — serve direct URL. Browsers render images natively.
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
  const clean = url.toLowerCase().split('?')[0];
  return clean.endsWith('.pdf') || clean.includes('.pdf');
}
