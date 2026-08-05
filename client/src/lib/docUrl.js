/**
 * docUrl.js — Cloudinary document URL transformer
 *
 * Problem: Cloudinary serves uploaded PDFs with a `Content-Disposition: attachment`
 * header by default, causing the browser to DOWNLOAD the file instead of opening
 * it as a PDF in a new tab.
 *
 * Solution:
 *   For Cloudinary URLs, inject the `fl_inline` flag into the transformation
 *   segment, which tells Cloudinary to serve the file with
 *   `Content-Disposition: inline` so the browser renders it natively.
 *
 * For non-Cloudinary URLs (e.g. S3, direct uploads) the URL is returned as-is
 * since those should already be served correctly.
 */

/**
 * Returns a URL that will open as a viewable document (PDF or image) in a
 * new browser tab rather than triggering a download.
 *
 * @param {string} url - The raw document URL from the database.
 * @returns {string}   - The transformed URL safe for use in target="_blank".
 */
export function getViewableDocUrl(url) {
  if (!url) return '';

  // Only transform Cloudinary delivery URLs
  if (!url.includes('res.cloudinary.com')) return url;

  // If this is a PDF, inject `fl_inline` into the Cloudinary transformation
  // chain so the browser opens it as a PDF instead of downloading it.
  //
  // Cloudinary URL anatomy:
  //   https://res.cloudinary.com/<cloud>/image/upload/<transforms>/<public_id>
  //                                                              ^^^^^^^^^^^
  //   We insert `fl_inline` before the public_id segment.
  //
  // Also handles `raw/upload` (Cloudinary's resource_type for arbitrary files)
  // which is how PDFs with crypto filenames are stored.

  // Already has fl_inline → return as-is
  if (url.includes('fl_inline')) return url;

  // Replace `/upload/` with `/upload/fl_inline/`
  return url.replace('/upload/', '/upload/fl_inline/');
}

/**
 * Returns true if the URL points to a PDF file.
 * Used to render a PDF icon vs. image icon in the UI.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isPdfUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase().split('?')[0]; // strip query params
  return lower.endsWith('.pdf') || lower.includes('/pdf') || url.includes('.pdf');
}
