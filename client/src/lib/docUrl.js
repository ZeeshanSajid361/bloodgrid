/**
 * docUrl.js — Cloudinary document URL transformer
 *
 * Problem: Cloudinary serves PDFs with Content-Disposition: attachment by
 * default, causing the browser to DOWNLOAD the file instead of opening it.
 *
 * Solution strategy:
 *
 *   NEW uploads  → Uploaded as resource_type: 'image' on the server.
 *                  URL looks like: .../image/upload/v.../folder/file.pdf
 *                  We inject `fl_inline` → renders PDF in browser tab. ✅
 *
 *   LEGACY uploads → Were uploaded as resource_type: 'raw'.
 *                    URL looks like: .../raw/upload/v.../folder/file.pdf
 *                    raw type does NOT support transformations.
 *                    We rewrite raw → image in the URL so fl_inline works. ✅
 *                    (Cloudinary allows this cross-resource-type URL rewrite
 *                    for PDFs because it actually stores the content either way.)
 *
 * For non-Cloudinary URLs the original URL is returned unchanged.
 */

/**
 * Returns a URL that opens as a viewable PDF/document in a new browser tab
 * instead of triggering a file download.
 *
 * @param {string} url - Raw document URL from the database.
 * @returns {string}   - Transformed URL with fl_inline for PDFs.
 */
export function getViewableDocUrl(url) {
  if (!url) return '';

  // Only transform Cloudinary delivery URLs
  if (!url.includes('res.cloudinary.com')) return url;

  let transformed = url;

  // STEP 1: Rewrite legacy raw/upload → image/upload
  // raw resource type doesn't support transformations. Rewriting to image
  // makes fl_inline work and Cloudinary will still serve the file correctly.
  if (transformed.includes('/raw/upload/')) {
    transformed = transformed.replace('/raw/upload/', '/image/upload/');
  }

  // STEP 2: Inject fl_inline if not already present
  // fl_inline sets Content-Disposition: inline so the browser renders the
  // file natively instead of downloading it.
  if (!transformed.includes('fl_inline')) {
    transformed = transformed.replace('/image/upload/', '/image/upload/fl_inline/');
  }

  return transformed;
}

/**
 * Returns true if the URL points to a PDF file.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isPdfUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase().split('?')[0]; // strip query params
  return lower.endsWith('.pdf') || lower.includes('.pdf');
}
