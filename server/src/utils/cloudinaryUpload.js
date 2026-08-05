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
 * PDFs are uploaded with resource_type: 'image' (NOT 'raw').
 *
 * Why 'image' and not 'raw'?
 *   - 'raw' resource types do NOT support Cloudinary transformations, so you
 *     cannot control Content-Disposition headers — the browser always downloads.
 *   - 'image' resource type supports PDFs natively. Cloudinary renders the first
 *     page as a preview and, critically, serves the file with
 *     Content-Disposition: inline when the fl_inline flag is used, so the
 *     browser opens the PDF directly in a new tab instead of downloading it.
 *
 * The client-side docUrl.js utility adds fl_inline to the delivery URL.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const cloudinary = require('cloudinary').v2;
const { cloudinary: cloudConfig } = require('../config/env');

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
    const isPdf = mimetype === 'application/pdf';

    const options = {
      folder,
      // Use 'image' for PDFs — Cloudinary supports PDF as an image resource
      // type and this allows the fl_inline transformation flag so browsers
      // render the PDF inline instead of downloading it.
      // Use 'auto' for all other files (images detect automatically).
      resource_type: isPdf ? 'image' : 'auto',
      // Explicitly tell Cloudinary this is a PDF so it handles it correctly
      ...(isPdf && { format: 'pdf' }),
      ...(publicId && { public_id: publicId }),
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
 * Tries 'image' resource_type first (covers PDFs uploaded with the new strategy
 * and regular images). Falls back to 'raw' for any legacy uploads.
 *
 * @param {string} publicId
 * @returns {Promise<void>}
 */
async function deleteAsset(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    // If 'image' delete didn't find the resource, try 'raw' for legacy uploads
    if (result.result === 'not found') {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }
  } catch {
    // Non-fatal: if deletion fails (e.g. already deleted), log and continue
    console.warn(`[Cloudinary] Could not delete asset: ${publicId}`);
  }
}

module.exports = { uploadBuffer, deleteAsset };
