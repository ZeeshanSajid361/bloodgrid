/**
 * Tour "seen" persistence for the AppSpotlightTour onboarding guide.
 *
 * BloodGrid storage key with legacy BloodSync fallback so returning users
 * are NOT re-onboarded after the rebrand. Writes always go to the new key.
 */

const TOUR_SEEN_PREFIX   = 'bloodgrid_spotlight_tour_';
const LEGACY_SEEN_PREFIX = 'bloodsync_spotlight_tour_';

export function hasSeenTour(tourKey) {
  try {
    return Boolean(
      localStorage.getItem(TOUR_SEEN_PREFIX + tourKey) ||
      localStorage.getItem(LEGACY_SEEN_PREFIX + tourKey)
    );
  } catch {
    return false;
  }
}

export function markTourSeen(tourKey) {
  try { localStorage.setItem(TOUR_SEEN_PREFIX + tourKey, 'true'); } catch { /* private mode */ }
}
