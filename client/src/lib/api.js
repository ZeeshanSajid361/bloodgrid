/**
 * Axios instance — base URL and request/response interceptors.
 *
 * Auth strategy (migrated from localStorage → HTTP-only cookies):
 *   - The server sets `bg_access` (15 min) and `bg_refresh` (7 days) as
 *     HTTP-only cookies on login/refresh. They are invisible to JavaScript,
 *     so injected scripts can no longer exfiltrate session tokens.
 *   - `withCredentials: true` below makes the browser attach those cookies to
 *     every request automatically — no manual header juggling.
 *   - The Authorization: Bearer header is still attached when a legacy token
 *     exists in localStorage (harmless fallback during migration; the server
 *     accepts either).
 *   - The response interceptor handles 401s by attempting a single cookie-based
 *     refresh; if that fails the user is redirected to /login.
 */

import axios from 'axios';

const rawUrl = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://bloodsync-api.onrender.com'
    : 'http://localhost:5000')
).replace(/\/+$/, '');

const BASE_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
  withCredentials: true, // send + receive HTTP-only auth cookies (bg_access / bg_refresh)
});

// ── Request interceptor — legacy Bearer fallback ────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Cookies are the primary auth channel now. The header is only kept as a
    // transitional fallback for sessions created before the migration.
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — refresh on 401 ───────────────────────────────────
let isRefreshing = false;
let pendingRequests = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt a refresh for 401s that haven't been retried and aren't
    // the refresh call itself (to avoid infinite loops).
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retried &&
      original.url !== '/auth/refresh'
    ) {
      original._retried = true;

      if (isRefreshing) {
        // Queue the request until the ongoing refresh finishes.
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject });
        }).then(() => api(original));
      }

      isRefreshing = true;
      // The refresh token rides in the HTTP-only bg_refresh cookie — no body
      // needed. (Body token kept as a fallback for pre-migration sessions.)
      const legacyRefresh = localStorage.getItem('refreshToken');

      try {
        const { data } = await api.post('/auth/refresh', legacyRefresh ? { refreshToken: legacyRefresh } : {});
        // Tokens now live in rotated cookies; only mirror to localStorage
        // while a legacy session is being transitioned.
        if (legacyRefresh && data?.data?.refreshToken) {
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
        }

        pendingRequests.forEach(({ resolve }) => resolve());
        pendingRequests = [];
        isRefreshing = false;

        return api(original);
      } catch {
        pendingRequests.forEach(({ reject }) => reject(error));
        pendingRequests = [];
        isRefreshing = false;

        // Refresh failed — clear any stale session state, purge cache, and
        // redirect to login ONLY when actually on a protected page. Hard-
        // redirecting while already on /login (e.g. app boot with an expired
        // cookie probing /auth/me) caused an infinite reload loop.
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        try {
          const { clearAllUserDataCache } = await import('../context/AuthContext');
          clearAllUserDataCache();
        } catch {}

        const path = window.location.pathname;
        const isPublicPath =
          path === '/' || path === '/login' || path === '/register' ||
          path.startsWith('/verify-email') || path.startsWith('/forgot-password') ||
          path.startsWith('/reset-password') || path.startsWith('/qr/');
        if (!isPublicPath) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
