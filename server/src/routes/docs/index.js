'use strict';

/**
 * Document proxy route — GET /api/docs/view?url=<encoded-cloudinary-url>
 *
 * Why this exists:
 *   Cloudinary stores PDFs as 'raw' resource type which means Cloudinary sends
 *   Content-Disposition: attachment — forcing a browser download instead of viewing.
 *
 * How it works:
 *   1. Client calls GET /api/docs/view?url=<encoded-url>
 *   2. Server proxy fetches the file from Cloudinary (with fallback logic for raw vs image)
 *   3. Server streams it back to browser with:
 *        Content-Type: application/pdf
 *        Content-Disposition: inline; filename="..."
 *      This forces the browser to render the PDF natively in the tab!
 */

const express = require('express');
const https   = require('https');
const http    = require('http');
const url     = require('url');

const router = express.Router();

const ALLOWED_HOSTS = ['res.cloudinary.com'];

/**
 * Helper to perform an HTTP(S) GET request following redirects and handling fallbacks.
 */
function fetchUrl(targetUrl, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new url.URL(targetUrl);
    } catch (e) {
      return reject(e);
    }

    const transport = parsed.protocol === 'https:' ? https : http;

    const req = transport.get(targetUrl, (res) => {
      // Follow redirects (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        let redirectTarget = res.headers.location;
        if (redirectTarget.startsWith('/')) {
          redirectTarget = `${parsed.protocol}//${parsed.host}${redirectTarget}`;
        }
        return fetchUrl(redirectTarget, maxRedirects - 1).then(resolve).catch(reject);
      }

      resolve({ statusCode: res.statusCode, headers: res.headers, stream: res });
    });

    req.on('error', reject);
  });
}

// ─── GET /api/docs/view ──────────────────────────────────────────────────────
router.get('/view', async (req, res) => {
  const rawUrl = req.query.url;

  if (!rawUrl) {
    return res.status(400).json({ success: false, message: 'url query param is required.' });
  }

  let decoded;
  try {
    decoded = decodeURIComponent(rawUrl);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid URL encoding.' });
  }

  // Security whitelist check
  let parsed;
  try {
    parsed = new url.URL(decoded);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid URL.' });
  }

  const isAllowed = ALLOWED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
  if (!isAllowed) {
    return res.status(403).json({ success: false, message: 'URL host not permitted.' });
  }

  // Clean invalid transformation flags if present (e.g. fl_inline on raw URLs causes Cloudinary 400)
  let cleanUrl = decoded.replace('/fl_inline/', '/').replace('/fl_attachment/', '/');

  try {
    let result = await fetchUrl(cleanUrl);

    // FALLBACK LOGIC:
    // If Cloudinary returned 400 or 404, check if swapping resource type (/image/upload/ <-> /raw/upload/) resolves it.
    if ((result.statusCode === 400 || result.statusCode === 404) && cleanUrl.includes('/image/upload/')) {
      const altUrl = cleanUrl.replace('/image/upload/', '/raw/upload/');
      const altResult = await fetchUrl(altUrl);
      if (altResult.statusCode === 200) {
        result = altResult;
        cleanUrl = altUrl;
      }
    } else if ((result.statusCode === 400 || result.statusCode === 404) && cleanUrl.includes('/raw/upload/')) {
      const altUrl = cleanUrl.replace('/raw/upload/', '/image/upload/');
      const altResult = await fetchUrl(altUrl);
      if (altResult.statusCode === 200) {
        result = altResult;
        cleanUrl = altUrl;
      }
    }

    if (result.statusCode !== 200) {
      return res.status(result.statusCode).json({
        success: false,
        message: `Upstream Cloudinary returned status ${result.statusCode}`,
      });
    }

    // Determine content type
    const lower = cleanUrl.toLowerCase().split('?')[0];
    let contentType = result.headers['content-type'] || 'application/octet-stream';
    if (lower.endsWith('.pdf') || contentType.includes('pdf')) {
      contentType = 'application/pdf';
    } else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (lower.endsWith('.png')) {
      contentType = 'image/png';
    } else if (lower.endsWith('.webp')) {
      contentType = 'image/webp';
    }

    const filename = cleanUrl.split('/').pop().split('?')[0] || 'document';

    // Set headers that instruct browser to display inline
    res.status(200);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    result.stream.pipe(res);
  } catch (err) {
    console.error('[DocProxy] Error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ success: false, message: 'Failed to proxy document.', error: err.message });
    }
  }
});

module.exports = router;
