/**
 * HTTP-only auth cookie helpers.
 *
 * The platform previously persisted JWTs in localStorage on the client —
 * readable by any injected script (XSS) and re-attached manually on every
 * request. Tokens now live in HTTP-only cookies set by the server:
 *
 *   bg_access   — short-lived access token, 15 min, sent on every API call.
 *   bg_refresh  — 7-day refresh token, path-scoped to /api/auth so it is only
 *                 transmitted on refresh/logout requests.
 *
 * Cross-origin notes:
 *   - Development: client (localhost:5173) and API (localhost:5000) are the
 *     same registrable site, so SameSite=Lax cookies flow fine over HTTP.
 *   - Production: the client (Vercel) and API (Render) live on different
 *     registrable domains, which requires SameSite=None + Secure, per the
 *     cross-site cookie spec.
 *
 * The Authorization: Bearer header remains fully supported (checked first in
 * requireAuth) so REST/EMN machine clients keep working without a cookie jar.
 */

'use strict';

const { nodeEnv, jwt } = require('../config/env');

const ACCESS_COOKIE  = 'bg_access';
const REFRESH_COOKIE = 'bg_refresh';

/** Convert "15m" / "7d" / "12h" / "30s" style durations to milliseconds. */
function expiresMs(value, fallbackMs) {
  const match = /^(\d+)\s*([smhd])$/i.exec(String(value || '').trim());
  if (!match) return fallbackMs;
  const units = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * units[match[2].toLowerCase()];
}

const isProduction = nodeEnv === 'production';

const baseCookieOptions = {
  httpOnly: true,                              // invisible to document.cookie / XSS
  secure: isProduction,                        // HTTPS-only in production
  sameSite: isProduction ? 'none' : 'lax',     // 'none' required for cross-domain prod
};

/**
 * Attach fresh access + refresh cookies to a response.
 * Call after a successful login or token refresh.
 */
function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions,
    path: '/',
    maxAge: expiresMs(jwt.accessExpiresIn, 15 * 60_000),
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions,
    path: '/api/auth',   // scope: only refresh/logout endpoints receive it
    maxAge: expiresMs(jwt.refreshExpiresIn, 7 * 24 * 60 * 60_000),
  });
}

/**
 * Expire both auth cookies (logout / failed refresh).
 */
function clearAuthCookies(res) {
  res.cookie(ACCESS_COOKIE, '', { ...baseCookieOptions, path: '/', maxAge: 0 });
  res.cookie(REFRESH_COOKIE, '', { ...baseCookieOptions, path: '/api/auth', maxAge: 0 });
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  setAuthCookies,
  clearAuthCookies,
};
