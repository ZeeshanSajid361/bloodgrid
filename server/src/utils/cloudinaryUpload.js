/**
 * Cloudinary upload helper.
 *
 * Wraps the Cloudinary SDK v2 upload_stream API in a Promise so it can be
 * awaited directly from route handlers. Multer provides the file buffer via
 * memoryStorage — no temp files are written to disk.
 *
 * All uploads go into the 'bloodsync/requests' folder on Cloudinary so they
 * are easy to find and bulk-delete if needed.
 *
 * Returns the Cloudinary upload result object, from which the caller extracts:
 *   - result.secure_url  → stored as documentUrl on the Request document
 *   - result.public_id   → stored for future deletion (admin reject flow)
 *
 * ── PDF Strategy ─────────────────────────────────────────────────────────────
 * PDFs are uploaded with resource_type: 'raw'.
 *
 * The client-side docUrl.js wraps PDF URLs in Google Docs Viewer so they open
 * inline in the browser regardless of Cloudinary's resource type or
 * Content-Disposition header.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const cloudinary = require('cloudinary').v2;
const { cloudinary: cloudConfig } = require('../config/env');

/** Placeholder cloud names that indicate "no real Cloudinary account configured".
 *  Matches .env.example defaults and the values a fresh collaborator is most
 *  likely to leave in place while testing locally. */
const PLACEHOLDER_CLOUD_NAMES = new Set([
  '', 'your_cloud_name', 'demo', 'test', 'placeholder', 'bloodgrid-dev',
]);

function isPlaceholderConfig() {
  return PLACEHOLDER_CLOUD_NAMES.has((cloudConfig.cloudName || '').trim().toLowerCase());
}

let placeholderWarningShown = false;

cloudinary.config({
  cloud_name: cloudConfig.cloudName,
  api_key:    cloudConfig.apiKey,
  api_secret: cloudConfig.apiSecret,
});

/**
 * Uploads a Buffer to Cloudinary and returns the upload result.
 *
 * @param {Buffer} buffer     - File buffer from Multer memoryStorage
 * @param {string} folder     - Cloudinary folder path
 * @param {string} [publicId] - Optional explicit public_id (e.g. for updates)
 * @param {string} [mimetype] - MIME type of the file
 * @returns {Promise<import('cloudinary').UploadApiResponse>}
 */
function uploadBuffer(buffer, folder = 'bloodsync/requests', publicId, mimetype) {
  return new Promise((resolve, reject) => {
    // Dev-mode fallback: with placeholder credentials the Cloudinary API call
    // would fail (and block local end-to-end testing of the request → approval
    // → fulfillment flow). Return a stub URL instead so the workflow completes.
    // Production credentials take the real upload path below, unchanged.
    if (isPlaceholderConfig()) {
      if (!placeholderWarningShown) {
        placeholderWarningShown = true;
        console.warn(
          '[Cloudinary] Placeholder credentials detected — uploads are stubbed with local URLs. ' +
          'Set real CLOUDINARY_* values in server/.env to store documents.'
        );
      }
      const crypto = require('crypto');
      const id = crypto.randomBytes(10).toString('hex');
      const isPdf = mimetype === 'application/pdf';
      return resolve({
        secure_url: `https://res.cloudinary.com/placeholder/${isPdf ? 'raw' : 'image'}/upload/${folder}/${id}${isPdf ? '.pdf' : '.png'}`,
        public_id: `${folder}/${id}`,
      });
    }

    const isPdf = mimetype === 'application/pdf';

    let finalPublicId = publicId;
    if (isPdf && !finalPublicId) {
      const crypto = require('crypto');
      finalPublicId = crypto.randomBytes(12).toString('hex') + '.pdf';
    }

    const options = {
      folder,
      resource_type: isPdf ? 'raw' : 'auto',
      ...(finalPublicId && { public_id: finalPublicId }),
    };

    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });

    stream.end(buffer);
  });
}

/**
 * Deletes a Cloudinary asset by public_id.
 * Used when an admin rejects a request — cleans up the stored document.
 *
 * @param {string} publicId
 * @returns {Promise<void>}
 */
async function deleteAsset(publicId) {
  try {
    // Try 'image' resource_type first, fall back to 'raw' for PDFs
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (result.result === 'not found') {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }
  } catch {
    console.warn(`[Cloudinary] Could not delete asset: ${publicId}`);
  }
}

module.exports = { uploadBuffer, deleteAsset };
