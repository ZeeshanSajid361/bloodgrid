/**
 * API key utility for hospital inventory sync.
 *
 * A raw key (shown once to the hospital admin) is never stored — only its
 * bcrypt hash lives in the database. This mirrors how production platforms
 * (Stripe, GitHub) handle API keys.
 *
 * Key format:  bl_<24 random hex bytes>
 * Example:     bl_a3f9c1d2e8b4a07f561c3d92e1b50faa
 *
 * Usage:
 *   const { rawKey, hash } = await generateApiKey();
 *   org.apiKeyHash = hash;  // save hash to DB
 *   // return rawKey to admin once — never again
 *
 *   const valid = await verifyApiKey(headerValue, org.apiKeyHash);
 */

'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const KEY_PREFIX = 'bl_';
const BCRYPT_ROUNDS = 10;

/**
 * Generate a new API key and its bcrypt hash.
 *
 * @returns {Promise<{ rawKey: string, hash: string, lookup: string }>}  
 *          lookup = first 10 chars of the raw key ("bl_" + 7 hex). Stored in
 *          plain text on the org so requireApiKey can do an O(1) index lookup
 *          before a single bcrypt.compare — the prefix cannot recreate the key.
 */
async function generateApiKey() {
  const raw = KEY_PREFIX + crypto.randomBytes(24).toString('hex');
  const hash = await bcrypt.hash(raw, BCRYPT_ROUNDS);
  return { rawKey: raw, hash, lookup: raw.slice(0, 10) };
}

/**
 * Verify an incoming API key against a stored bcrypt hash.
 *
 * @param {string} rawKey     - Key from the Authorization header
 * @param {string} storedHash - Hash stored in Organization.apiKeyHash
 * @returns {Promise<boolean>}
 */
async function verifyApiKey(rawKey, storedHash) {
  if (!rawKey || !storedHash) return false;
  return bcrypt.compare(rawKey, storedHash);
}

module.exports = { generateApiKey, verifyApiKey };
