/**
 * LocationPickerModal — Leaflet + OpenStreetMap + Nominatim edition.
 *
 * Replaces the previous Google Maps embed implementation, which was blocked on
 * a paid VITE_GOOGLE_MAPS_API_KEY. This version is 100% free and open-source:
 *
 *   🗺  Map tiles ......... OpenStreetMap standard tile service
 *   🔍  Forward geocoding . Nominatim /search (address autocomplete)
 *   📍  Reverse geocoding . Nominatim /reverse (pin → exact address)
 *   📌  Placement ......... click-to-drop, drag-to-adjust, GPS button
 *
 * It is also fully international: city / province / street are derived from
 * Nominatim's worldwide address data instead of hardcoded Pakistan lookup
 * tables, so the picker works in any country out of the box.
 *
 * Props contract (unchanged from the previous implementation):
 *   isOpen            — modal visibility
 *   onClose           — close callback
 *   onSelectLocation  — receives { latitude, longitude, street, address, city, province, mapsUrl }
 *   initialLocation   — prefill ({ latitude, longitude, street|address, city, province, mapsUrl })
 *
 * Nominatim usage policy: ≤1 request/second, debounced input (450 ms),
 * aborted stale requests, and a small `limit`. If the geocoder is unreachable
 * the map and manual fields keep working — degradation is graceful.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, X, Check, Loader2, Building2 } from 'lucide-react';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/** Default fallback view (kept from the previous implementation). */
const DEFAULT_CENTER = { lat: 33.6844, lng: 73.0479 };

/** Brand-red teardrop pin as a divIcon — avoids the classic broken default
 *  marker image when bundlers rewrite asset URLs. */
const pinIcon = L.divIcon({
  className: 'bg-pin-wrapper',
  html: `
    <svg width="34" height="46" viewBox="0 0 34 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pinGrad" x1="30%" y1="10%" x2="70%" y2="90%">
          <stop offset="0%" stop-color="#ff4d4d"/>
          <stop offset="55%" stop-color="#e8291b"/>
          <stop offset="100%" stop-color="#96281b"/>
        </linearGradient>
      </defs>
      <path d="M17 1C9.8 1 4 6.8 4 14c0 9.4 11.2 23.4 12.4 24.8a.9.9 0 0 0 1.2 0C18.8 37.4 30 23.4 30 14c0-7.2-5.8-13-13-13z" fill="url(#pinGrad)" stroke="#ffffff" stroke-width="1.6"/>
      <circle cx="17" cy="13.6" r="4.6" fill="#ffffff" opacity="0.92"/>
    </svg>`,
  iconSize: [34, 46],
  iconAnchor: [17, 44],
});

/* ── Nominatim helpers ─────────────────────────────────────────────────────── */

/** Extracts a human street line from a Nominatim address object. */
function streetFromAddress(addr) {
  if (!addr) return '';
  const parts = [addr.house_number, addr.road || addr.pedestrian || addr.footway || addr.residential];
  const line = parts.filter(Boolean).join(' ');
  if (line) return line;
  return addr.suburb || addr.neighbourhood || addr.hamlet || addr.city_district || '';
}

/** Extracts the best city name from a Nominatim address object. */
function cityFromAddress(addr) {
  if (!addr) return '';
  return addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state_district || '';
}

/** Extracts the region/province from a Nominatim address object. */
function provinceFromAddress(addr) {
  if (!addr) return '';
  return addr.state || addr.province || addr.region || addr.county || '';
}

/** Rate-limited, abortable Nominatim fetch wrapper. */
function useNominatim() {
  const lastCallRef = useRef(0);
  const abortRef = useRef(null);

  return useCallback(async (path) => {
    // Nominatim policy: at most 1 request/second — enforce a 350ms floor and
    // abort any stale in-flight request before starting a new one.
    if (abortRef.current) abortRef.current.abort();
    const wait = Math.max(0, 350 - (Date.now() - lastCallRef.current));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastCallRef.current = Date.now();

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`${NOMINATIM_BASE}${path}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Nominatim ${res.status}`);
      return await res.json();
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);
}

/* ── Leaflet child helpers ─────────────────────────────────────────────────── */

/** Forward map clicks as pin placements. */
function MapClickCatcher({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Recalculate tile layout once the modal container is actually laid out. */
function MapAutoResize() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 60);
    const t2 = setTimeout(() => map.invalidateSize(), 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [map]);
  return null;
}

/** Smoothly move the viewport whenever the pin coordinates change. */
function MapFollowPin({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.5 });
  }, [lat, lng, map]);
  return null;
}

/* ── Main component ────────────────────────────────────────────────────────── */

export default function LocationPickerModal({ isOpen, onClose, onSelectLocation, initialLocation = {} }) {
  const nominatim = useNominatim();

  const safeInit = initialLocation && typeof initialLocation === 'object' ? initialLocation : {};

  const [lat, setLat] = useState(
    typeof safeInit.latitude === 'number' && !Number.isNaN(safeInit.latitude) ? safeInit.latitude : DEFAULT_CENTER.lat
  );
  const [lng, setLng] = useState(
    typeof safeInit.longitude === 'number' && !Number.isNaN(safeInit.longitude) ? safeInit.longitude : DEFAULT_CENTER.lng
  );
  const [addressText, setAddressText] = useState(
    typeof safeInit.street === 'string' ? safeInit.street : (typeof safeInit.address === 'string' ? safeInit.address : '')
  );
  const [city, setCity] = useState(typeof safeInit.city === 'string' ? safeInit.city.trim() : '');
  const [province, setProvince] = useState(typeof safeInit.province === 'string' ? safeInit.province.trim() : '');

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [geoStatus, setGeoStatus] = useState(''); // '' | 'locating' | 'error'
  const [reverseBusy, setReverseBusy] = useState(false);
  const [geocoderBlocked, setGeocoderBlocked] = useState(false);

  const debounceRef = useRef(null);

  /* Synchronise state whenever the modal opens. */
  useEffect(() => {
    if (!isOpen) return;
    const init = initialLocation && typeof initialLocation === 'object' ? initialLocation : {};
    const initLat = typeof init.latitude === 'number' && !Number.isNaN(init.latitude) ? init.latitude : DEFAULT_CENTER.lat;
    const initLng = typeof init.longitude === 'number' && !Number.isNaN(init.longitude) ? init.longitude : DEFAULT_CENTER.lng;
    setLat(initLat);
    setLng(initLng);
    setAddressText(typeof init.street === 'string' ? init.street : (typeof init.address === 'string' ? init.address : ''));
    setCity(typeof init.city === 'string' ? init.city.trim() : '');
    setProvince(typeof init.province === 'string' ? init.province.trim() : '');
    setSearchQuery('');
    setResults([]);
    setShowResults(false);
    setGeocoderBlocked(false);
  }, [isOpen, initialLocation]);

  /* Prevent background scrolling while the modal is open. */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  /* Debounced forward-geocode autocomplete (450ms). */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    if (!isOpen || q.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await nominatim(
          `/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`
        );
        setResults(Array.isArray(data) ? data : []);
        setShowResults(true);
        setGeocoderBlocked(false);
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setResults([]);
          setGeocoderBlocked(true); // offline / blocked — manual entry still works
        }
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, isOpen, nominatim]);

  /* Reverse-geocode a pin placement and fill the address fields. */
  const reverseFill = useCallback(async (nextLat, nextLng) => {
    setReverseBusy(true);
    try {
      const data = await nominatim(
        `/reverse?format=jsonv2&lat=${nextLat}&lon=${nextLng}&addressdetails=1&zoom=18`
      );
      if (data && data.address) {
        const street = streetFromAddress(data.address);
        if (street) setAddressText(street);
        const c = cityFromAddress(data.address);
        if (c) setCity(c);
        const p = provinceFromAddress(data.address);
        if (p) setProvince(p);
        setGeocoderBlocked(false);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setGeocoderBlocked(true);
    } finally {
      setReverseBusy(false);
    }
  }, [nominatim]);

  /** Central pin placement handler (map click / search result / GPS). */
  const placePin = useCallback((coords, { reverse = true } = {}) => {
    setLat(coords.lat);
    setLng(coords.lng);
    if (reverse) reverseFill(coords.lat, coords.lng);
  }, [reverseFill]);

  /** Choose a search result from the dropdown. */
  function handleSelectResult(item) {
    const coords = { lat: Number(item.lat), lng: Number(item.lon) };
    placePin(coords, { reverse: false });
    const addr = item.address || {};
    const street = streetFromAddress(addr) || String(item.display_name || '').split(',')[0];
    if (street) setAddressText(street);
    const c = cityFromAddress(addr);
    if (c) setCity(c);
    const p = provinceFromAddress(addr);
    if (p) setProvince(p);
    setShowResults(false);
    setSearchQuery('');
  }

  /** Browser geolocation. */
  function handleUseGps() {
    if (!('geolocation' in navigator)) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus('');
        placePin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setGeoStatus('error'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  /** Confirm selection — exact contract preserved from the previous modal. */
  function handleConfirm() {
    const finalAddress = addressText.trim() || `${city.trim()}${province.trim() ? `, ${province.trim()}` : ''}`;
    onSelectLocation({
      latitude: lat,
      longitude: lng,
      street: finalAddress,
      address: finalAddress,
      city: city.trim(),
      province: province.trim(),
      // Keyless deep-link (plain link — no API key, unlike the Maps JS API).
      mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
    });
    onClose();
  }

  if (!isOpen) return null;

  return createPortal(
    <div style={overlayStyle} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle} className="bg-location-modal">

        {/* ── Header ── */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={headerIconStyle}><MapPin size={17} color="#ffffff" /></div>
            <div>
              <div style={headerTitleStyle}>Select Exact Location</div>
              <div style={headerSubStyle}>OpenStreetMap + Nominatim — free, no API key</div>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Close location picker">
            <X size={18} color="#e2e8f0" />
          </button>
        </div>

        <div style={bodyStyle} className="bg-location-body">

          {/* ── Map pane ── */}
          <div style={mapPaneStyle} className="bg-location-map">
            <MapContainer
              center={[lat, lng]}
              zoom={15}
              style={{ width: '100%', height: '100%' }}
              attributionControl
            >
              <TileLayer
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker
                position={[lat, lng]}
                icon={pinIcon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const p = e.target.getLatLng();
                    placePin({ lat: p.lat, lng: p.lng });
                  },
                }}
              />
              <MapClickCatcher onPick={(coords) => placePin(coords)} />
              <MapAutoResize />
              <MapFollowPin lat={lat} lng={lng} />
            </MapContainer>

            {/* Floating GPS control */}
            <button style={gpsBtnStyle} onClick={handleUseGps} title="Use my current position">
              {geoStatus === 'locating' ? <Loader2 size={16} color="#ffffff" className="spin" /> : <Navigation size={16} color="#ffffff" />}
            </button>

            {/* Status line */}
            <div style={statusLineStyle}>
              {reverseBusy ? 'Resolving address…' : (
                <>
                  <MapPin size={11} color="#ff7b7b" style={{ display: 'inline', marginRight: 4 }} />
                  {typeof lat === 'number' ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : '—'}
                </>
              )}
            </div>
          </div>

          {/* ── Form pane ── */}
          <div style={formPaneStyle} className="bg-location-form">

            {/* Search with autocomplete */}
            <div style={{ position: 'relative' }}>
              <div style={labelStyle}>
                <Search size={12} color="#ff7b7b" style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
                Search address worldwide
              </div>
              <input
                style={inputStyle}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (results.length) setShowResults(true); }}
                placeholder="e.g. Agha Khan University Hospital, Karachi"
                autoComplete="off"
              />
              {searching && (
                <Loader2 size={14} color="#ff7b7b" className="spin" style={{ position: 'absolute', right: 12, top: 34 }} />
              )}
              {showResults && results.length > 0 && (
                <div style={resultsStyle} className="bg-location-results">
                  {results.map((r, i) => (
                    <button
                      key={r.place_id || i}
                      style={resultItemStyle}
                      onClick={() => handleSelectResult(r)}
                    >
                      <MapPin size={13} color="#ff7b7b" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{r.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
              {geocoderBlocked && (
                <div style={{ fontSize: '0.72rem', color: '#e2e8f0', marginTop: 6, opacity: 0.9 }}>
                  Address search unavailable (offline?) — drop a pin on the map or type the address manually.
                </div>
              )}
            </div>

            {/* Manual fields (auto-filled by reverse geocoding) */}
            <div>
              <div style={labelStyle}>
                <Building2 size={12} color="#ff7b7b" style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
                Street address
              </div>
              <input
                style={inputStyle}
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="House / street / landmark"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={labelStyle}>City</div>
                <input
                  style={inputStyle}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <div style={labelStyle}>State / Province</div>
                <input
                  style={inputStyle}
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Province"
                />
              </div>
            </div>

            {geoStatus === 'error' && (
              <div style={{ fontSize: '0.75rem', color: '#ff7b7b' }}>
                GPS unavailable — place the pin manually.
              </div>
            )}

            <button style={confirmBtnStyle} onClick={handleConfirm}>
              <Check size={15} color="#ffffff" />
              Confirm Location
            </button>
          </div>
        </div>

        <style>{`
          .bg-location-modal { font-family: 'Inter', system-ui, sans-serif; }
          .bg-location-modal .spin { animation: bgloc-spin 0.9s linear infinite; }
          @keyframes bgloc-spin { to { transform: rotate(360deg); } }
          /* Dark-tint the OSM tiles to match the glassmorphism theme. */
          .bg-location-map .leaflet-tile-pane {
            filter: brightness(0.78) saturate(0.82) contrast(1.05);
          }
          .bg-location-map .leaflet-container {
            background: #0f1520;
            font-family: 'Inter', system-ui, sans-serif;
          }
          .bg-location-map .leaflet-control-attribution {
            background: rgba(8, 11, 16, 0.75);
            color: #cbd5e1;
            font-size: 9px;
          }
          .bg-location-map .leaflet-control-attribution a { color: #e2e8f0; }
          .bg-pin-wrapper { background: transparent; border: none; }
          .bg-location-results::-webkit-scrollbar { width: 6px; }
          .bg-location-results::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }

          @media (max-width: 768px) {
            .bg-location-body { flex-direction: column; }
            .bg-location-map { min-height: 38vh; }
            .bg-location-form { max-height: none; overflow-y: auto; }
            .bg-location-results { max-height: 180px; }
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
}

/* ── Inline styles (dark glassmorphism, matching the app design system) ───── */

const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 100000,
  background: 'rgba(4, 6, 10, 0.72)',
  backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '16px',
};

const modalStyle = {
  width: 'min(960px, 100%)', maxHeight: '92vh',
  background: 'linear-gradient(160deg, #0f1520 0%, #131926 100%)',
  border: '1px solid rgba(255, 255, 255, 0.09)',
  borderRadius: 18, overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
};

const headerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
};

const headerIconStyle = {
  width: 34, height: 34, borderRadius: 10,
  background: 'linear-gradient(135deg, #ff4d4d 0%, #c0392b 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 0 18px rgba(192, 57, 43, 0.45)',
};

const headerTitleStyle = { fontSize: '0.98rem', fontWeight: 800, color: '#ffffff' };
const headerSubStyle = { fontSize: '0.72rem', color: '#e2e8f0', marginTop: 1 };

const closeBtnStyle = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 9, width: 32, height: 32, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const bodyStyle = {
  display: 'flex', flexDirection: 'row', minHeight: 360,
  overflow: 'auto',
};

const mapPaneStyle = {
  position: 'relative', flex: '1.25 1 0', minHeight: 380, background: '#0f1520',
};

const formPaneStyle = {
  flex: '1 1 0', padding: 16, display: 'flex', flexDirection: 'column',
  gap: 12, overflowY: 'auto', maxHeight: '70vh',
  background: 'rgba(255,255,255,0.015)',
  borderTop: 'none',
};

const labelStyle = {
  fontSize: '0.7rem', fontWeight: 700, color: '#ffffff',
  textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6,
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 9, padding: '9px 12px',
  color: '#ffffff', fontSize: '0.86rem', outline: 'none',
};

const resultsStyle = {
  position: 'absolute', top: 62, left: 0, right: 0, zIndex: 50,
  background: '#131926', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10, maxHeight: 220, overflowY: 'auto',
  boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
};

const resultItemStyle = {
  display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%',
  background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
  padding: '9px 11px', cursor: 'pointer', textAlign: 'left',
  color: '#e2e8f0', fontSize: '0.8rem', lineHeight: 1.35,
};

const gpsBtnStyle = {
  position: 'absolute', top: 12, right: 12, zIndex: 1000,
  width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
  background: 'linear-gradient(135deg, #ff4d4d 0%, #c0392b 100%)',
  border: '1px solid rgba(255,255,255,0.25)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 16px rgba(192, 57, 43, 0.5)',
};

const statusLineStyle = {
  position: 'absolute', bottom: 10, left: 10, zIndex: 1000,
  background: 'rgba(8, 11, 16, 0.85)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '4px 10px', fontSize: '0.7rem', color: '#e2e8f0',
  backdropFilter: 'blur(4px)',
};

const confirmBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  marginTop: 'auto', padding: '11px 16px', borderRadius: 11, cursor: 'pointer',
  background: 'linear-gradient(135deg, #ff4d4d 0%, #c0392b 100%)',
  border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.9rem',
  boxShadow: '0 8px 24px rgba(192, 57, 43, 0.4)',
};
