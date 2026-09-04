/**
 * Authentication & RBAC middleware.
 *
 * requireAuth   — verifies the access token and attaches { id, role } to
 *                 req.user. Token is resolved in priority order:
 *
 *                   1. HTTP-only `bg_access` cookie (browser sessions — set by
 *                      the server on login/refresh; invisible to JavaScript)
 *                   2. Authorization: Bearer header (REST clients, EMN
 *                      machine sync, test harnesses — fully backward compatible)
 *
 *                 Returns 401 on any failure so the client knows to attempt a
 *                 token refresh.
 *
 * requireRole   — factory that returns a middleware accepting only specific
 *                 roles. Must be used after requireAuth in the middleware chain.
 */

'use strict';

const { verifyAccessToken } = require('../utils/token');
const { ACCESS_COOKIE } = require('../utils/authCookies');

/**
 * Resolves the bearer token for a request: cookie first, header second.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function resolveAccessToken(req) {
  const cookieToken = req.cookies?.[ACCESS_COOKIE];
  if (cookieToken && typeof cookieToken === 'string') return cookieToken;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7); // remove "Bearer " prefix
  }
  return null;
}

/**
 * Verifies the access token (cookie or Bearer header) and populates req.user
 * with { id, role } on success.
 *
 * @type {import('express').RequestHandler}
 */
function requireAuth(req, res, next) {
  const token = resolveAccessToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No access token provided. Please log in.',
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      message: isExpired
        ? 'Access token has expired. Please refresh your session.'
        : 'Invalid access token.',
      code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    });
  }
}

/**
 * Returns a middleware that allows only the specified roles through.
 * Must be placed after requireAuth in the route definition.
 *
 * Usage: router.get('/admin-only', requireAuth, requireRole(['admin']), handler)
 *
 * @param {string[]} roles — subset of ['donor', 'seeker', 'hospital', 'admin']
 * @returns {import('express').RequestHandler}
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      // Guard against being called without requireAuth — shouldn't happen in
      // correct middleware chains, but surface it clearly rather than crashing.
      return res.status(500).json({
        success: false,
        message: 'requireRole must be used after requireAuth.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This route requires one of: ${roles.join(', ')}.`,
      });
    }

    next();
  };
}

module.exports = { requireAuth, requireRole };
