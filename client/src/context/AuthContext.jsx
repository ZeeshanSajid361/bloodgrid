/**
 * Auth context — session state and authentication actions.
 *
 * Auth tokens now live in HTTP-only cookies set by the server (see lib/api.js),
 * so only the lightweight user *profile* is cached in localStorage for instant
 * first paint on refresh — session credentials never touch JS-readable storage.
 *
 * Login / page-load hydration uses Promise.all() to fetch the profile and the
 * role-specific dashboard data concurrently instead of sequentially — the
 * dashboard's own hooks then hit the warm cache and render immediately.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import cacheService from '../utils/CacheService';

const AuthContext = createContext(null);

export function clearAllUserDataCache() {
  cacheService.clear();
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('bloodsync_') || key.startsWith('app_cache:') || key.startsWith('donor_profile'))) {
        if (!key.startsWith('bloodsync_verif_resend_') && !key.startsWith('bloodsync_spotlight_tour_')) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.error('Error clearing app cache:', e);
  }
}

/**
 * Role-specific dashboard endpoints to pre-warm. Each entry runs in parallel
 * (Promise.all) the moment the session is established, so the dashboard mounts
 * against warm caches instead of cold-fetching its data serially.
 */
const ROLE_PREWARM = {
  hospital: () => [
    api.get('/hospitals/me').then(res => {
      if (res.data?.data) localStorage.setItem('bloodsync_hospital_profile_cache', JSON.stringify(res.data.data));
    }),
    api.get('/hospitals/requests').catch(() => {}),
  ],
  donor: () => [
    api.get('/donors/me').then(res => {
      if (res.data?.data) cacheService.set('donor_profile', res.data.data);
    }),
    api.get('/donors/requests').catch(() => {}),
  ],
  seeker: () => [
    api.get('/seekers/requests/mine?limit=50').then(res => {
      if (res.data?.data?.requests) localStorage.setItem('bloodsync_seeker_requests_cache', JSON.stringify(res.data.data.requests));
    }),
    api.get('/notifications/unread-count').catch(() => {}),
  ],
  admin: (userId) => [
    api.get('/admin/analytics').then(res => {
      if (res.data?.data) localStorage.setItem(`bloodsync_admin_analytics_${userId}`, JSON.stringify(res.data.data));
    }),
    api.get('/admin/requests?status=pending_review&limit=25').catch(() => {}),
  ],
  // Partner accounts authenticate with role 'hospital' but own a partner-type
  // org — pre-warm both dashboards' primary feeds.
  partner: () => [
    api.get('/hospitals/me').then(res => {
      if (res.data?.data) localStorage.setItem('bloodsync_hospital_profile_cache', JSON.stringify(res.data.data));
    }).catch(() => {}),
    api.get('/partners/drives').catch(() => {}),
  ],
};

/** Fire-and-forget parallel pre-warm for the given user's role. */
function prewarmRoleData(user) {
  if (!user?.role) return;
  const builders = ROLE_PREWARM[user.role] || [];
  const userId = user?._id || user?.id;
  // Own role first, plus the partner mirror when relevant.
  const tasks = [
    ...builders(userId),
    ...(user.role === 'hospital' ? (ROLE_PREWARM.partner?.() || []) : []),
  ];
  // Promise.all: all requests leave at the same instant — total latency is the
  // slowest single call, not the sum of sequential round-trips.
  Promise.allSettled(tasks).catch(() => {});
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until initial hydration done

  useEffect(() => {
    const stored = localStorage.getItem('user');

    // Cached profile gives an instant (0ms) first paint while the real
    // session check runs in the background.
    if (stored) {
      try {
        setUser(JSON.parse(stored));
        setLoading(false);
      } catch {
        localStorage.removeItem('user');
      }
    }

    // Hydrate: verify the cookie session AND pre-warm the role dashboard data
    // in parallel. With HTTP-only cookies there is no localStorage token to
    // gate on — if a session cookie exists, /auth/me resolves it.
    const sessionEstablished = api.get('/auth/me')
      .then((res) => res.data?.data)
      .catch(() => null);

    // Only pre-warm once we know a session exists — otherwise /auth/me's 401
    // would have already told us there's nothing to warm.
    sessionEstablished.then((profile) => {
      if (!profile) {
        // No valid session — drop any stale cached profile.
        if (stored) {
          localStorage.removeItem('user');
          setUser(null);
        }
        setLoading(false);
        return;
      }
      // Parallel: merge fresh profile + kick off dashboard data pre-warm.
      prewarmRoleData(profile);
      setUser((prev) => {
        const next = { ...prev, ...profile };
        localStorage.setItem('user', JSON.stringify(next));
        return next;
      });
      setLoading(false);
    });
  }, []);

  const login = useCallback(({ user: userData }) => {
    const newUserId = userData?._id || userData?.id;
    let prevUserId = null;
    try {
      const prevUserStr = localStorage.getItem('user');
      if (prevUserStr) {
        const prev = JSON.parse(prevUserStr);
        prevUserId = prev?._id || prev?.id;
      }
    } catch {}

    // Only clear cache if logging in as a DIFFERENT user account to prevent
    // cross-account leak while keeping instant load.
    if (newUserId && prevUserId && String(newUserId) !== String(prevUserId)) {
      clearAllUserDataCache();
    }

    // NOTE: accessToken/refreshToken are no longer persisted — the server set
    // them as HTTP-only cookies in the login response. Only the profile is
    // cached (for instant paint on refresh).
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    // Pre-warm every dashboard endpoint for this role in parallel (Promise.all
    // inside prewarmRoleData) so the dashboard mounts against warm caches.
    setTimeout(() => prewarmRoleData(userData), 0);
  }, []);

  const logout = useCallback(async () => {
    // Best-effort server-side invalidation — the server also expires the
    // HTTP-only auth cookies in this call. Don't block on failure.
    api.post('/auth/logout', {}).catch(() => {});

    // Clean up any pre-migration tokens plus the cached profile.
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    clearAllUserDataCache();
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => {
      const next = { ...prev, ...updatedUserData };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Convenience hook — throws if used outside AuthProvider.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
