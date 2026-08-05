'use strict';

/**
 * Document proxy route — GET /api/docs/view?url=<encoded-cloudinary-url>
 *
 * Why this exists:
 *   Cloudinary stores PDFs as 'raw' resource type which means the server sends
 *   Content-Disposition: attachment — forcing a download instead of rendering.
 *   We cannot change Cloudinary's response headers from the client side.
 *
 * How it works:
 *   1. Client calls GET /api/docs/view?url=<encoded-url>
 *   2. This proxy fetches the file from Cloudinary using Node's built-in https
 *   3. We pipe the response back to the browser with:
 *        Content-Type: application/pdf  (or image/jpeg etc)
 *        Content-Disposition: inline    (FORCES browser to render, not download)
 *
 * Security:
 *   - Only Cloudinary URLs are allowed (whitelist check)
 *   - No auth required — documents are already semi-public via Cloudinary links
 *     (knowing the URL is the only requirement, same as before)
 */

const express = require('express');
const https   = require('https');
const http    = require('http');
const url     = require('url');

const router = express.Router();

// ─── Whitelist: only proxy from trusted hosts ────────────────────────────────
const ALLOWED_HOSTS = ['res.cloudinary.com'];

// ─── GET /api/docs/view ──────────────────────────────────────────────────────
router.get('/view', (req, res) => {
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

  // Security: only allow whitelisted hosts
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

  // Choose http or https module based on protocol
  const transport = parsed.protocol === 'https:' ? https : http;

  const proxyReq = transport.get(decoded, (cloudRes) => {
    // Determine content type from file extension and upstream headers
    const upstreamType = cloudRes.headers['content-type'] || '';
    const lowerUrl     = decoded.toLowerCase();

    let contentType;
    if (lowerUrl.endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (lowerUrl.endsWith('.png')) {
      contentType = 'image/png';
    } else if (lowerUrl.endsWith('.webp')) {
      contentType = 'image/webp';
    } else {
      contentType = upstreamType || 'application/octet-stream';
    }

    // Derive filename from URL
    const filename = decoded.split('/').pop().split('?')[0] || 'document';

    // Pass through status code (200, 206 for range requests, etc.)
    res.status(cloudRes.statusCode === 200 ? 200 : cloudRes.statusCode);

    // Set headers that tell the browser to RENDER inline, not download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Pipe the upstream body directly to the response
    cloudRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[DocProxy] Upstream fetch error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ success: false, message: 'Failed to fetch document from upstream.' });
    }
  });
});

module.exports = router;
