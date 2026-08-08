/**
 * LocationPickerModal.jsx
 *
 * Interactive Location Picker component for BloodSync.
 * Allows hospital staff and blood seekers to set location via:
 *   1. Interactive OpenStreetMap Pin Picker
 *   2. GPS Browser Auto-Detect with deduplicated single-toast feedback
 *   3. Manual Address Entry / Google Maps URL Paste
 */

import { useState, useEffect } from 'react';
import { MapPin, Navigation, ExternalLink, CheckCircle2, X, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

// Major Pakistani cities fallback coordinates
const CITY_COORDS = {
  islamabad:  { lat: 33.6844, lng: 73.0479 },
  rawalpindi: { lat: 33.5989, lng: 73.0441 },
  lahore:     { lat: 31.5204, lng: 74.3587 },
  karachi:    { lat: 24.8607, lng: 67.0011 },
  peshawar:   { lat: 34.0151, lng: 71.5249 },
  multan:     { lat: 30.1575, lng: 71.5249 },
  faisalabad: { lat: 31.4504, lng: 73.1350 },
  quetta:     { lat: 30.1798, lng: 66.9750 },
};

export default function LocationPickerModal({ isOpen, onClose, onSelectLocation, initialLocation = {} }) {
  const [lat, setLat]               = useState(initialLocation.latitude || 33.6844);
  const [lng, setLng]               = useState(initialLocation.longitude || 73.0479);
  const [addressText, setAddressText] = useState(initialLocation.street || '');
  const [city, setCity]             = useState(initialLocation.city || 'Islamabad');
  const [province, setProvince]     = useState(initialLocation.province || 'Punjab');
  const [mapsUrl, setMapsUrl]       = useState(initialLocation.mapsUrl || '');

  const [loading, setLoading]       = useState(false);
  const [geocoding, setGeocoding]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialLocation.latitude && initialLocation.longitude) {
      setLat(initialLocation.latitude);
      setLng(initialLocation.longitude);
    } else if (initialLocation.city) {
      const key = initialLocation.city.toLowerCase().trim();
      if (CITY_COORDS[key]) {
        setLat(CITY_COORDS[key].lat);
        setLng(CITY_COORDS[key].lng);
      }
    }
  }, [initialLocation]);

  if (!isOpen) return null;

  // Single-toast deduplicated GPS Auto-Detection
  function handleDetectGps() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.', { id: 'gps-toast' });
      return;
    }
    setLoading(true);
    toast.loading('Detecting exact GPS position…', { id: 'gps-toast' });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude  = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setLat(latitude);
        setLng(longitude);
        const generatedUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        setMapsUrl(generatedUrl);
        
        await reverseGeocode(latitude, longitude);
        setLoading(false);
        toast.success('Exact GPS location detected!', { id: 'gps-toast' });
      },
      (err) => {
        setLoading(false);
        const errMsg = err.code === 1 
          ? 'GPS permission denied. Please pick a location on the map below.' 
          : 'Could not acquire GPS coordinates.';
        toast.error(errMsg, { id: 'gps-toast' });
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  // Reverse geocode via OpenStreetMap Nominatim
  async function reverseGeocode(latitude, longitude) {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      );
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const detectedCity = addr.city || addr.town || addr.county || addr.state_district || city;
        const detectedStreet = [addr.suburb, addr.neighbourhood, addr.road, addr.amenity].filter(Boolean).join(', ') || addressText;
        const detectedProvince = addr.state || province;

        setCity(detectedCity);
        if (detectedStreet) setAddressText(detectedStreet);
        setProvince(detectedProvince);
      }
    } catch (e) {
      console.warn('Reverse geocode failed:', e);
    } finally {
      setGeocoding(false);
    }
  }

  // Forward geocode search query (e.g. "PIMS Hospital Islamabad")
  async function handleSearchLocation(e) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Pakistan')}`
      );
      const results = await res.json();
      if (results && results.length > 0) {
        const first = results[0];
        const latitude  = parseFloat(first.lat);
        const longitude = parseFloat(first.lon);
        setLat(latitude);
        setLng(longitude);
        setMapsUrl(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
        await reverseGeocode(latitude, longitude);
        toast.success(`Found location: ${first.display_name.split(',')[0]}`, { id: 'gps-toast' });
      } else {
        toast.error('Location not found. Try searching with city name.', { id: 'gps-toast' });
      }
    } catch (err) {
      toast.error('Search failed. Please try again.', { id: 'gps-toast' });
    } finally {
      setGeocoding(false);
    }
  }

  function handleConfirm() {
    const finalUrl = mapsUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    onSelectLocation({
      latitude:  lat,
      longitude: lng,
      street:    addressText,
      city,
      province,
      mapsUrl:   finalUrl,
    });
    toast.success('Location confirmed!', { id: 'gps-toast' });
    onClose();
  }

  // Interactive OpenStreetMap Embed bounding box calculation
  const bboxDelta = 0.01;
  const bbox = `${lng - bboxDelta},${lat - bboxDelta},${lng + bboxDelta},${lat + bboxDelta}`;
  const mapIframeUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto',
        background: '#0f172a', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
            <MapPin size={22} color="#ef4444" /> Select Exact Location
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Search bar & GPS button */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearchLocation} style={{ flex: 1, display: 'flex', gap: '6px', minWidth: '220px' }}>
            <input
              className="input"
              style={{ fontSize: '0.85rem' }}
              placeholder="Search area, hospital name or landmark…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={geocoding}>
              {geocoding ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
            </button>
          </form>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleDetectGps}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', background: '#2563eb' }}
          >
            {loading ? <Loader2 size={14} className="spin" /> : <Navigation size={14} />}
            <span>Detect GPS Location</span>
          </button>
        </div>

        {/* Interactive Map Canvas Embed */}
        <div style={{
          position: 'relative', width: '100%', height: '240px', borderRadius: '12px',
          overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '16px', background: '#1e293b'
        }}>
          <iframe
            title="Interactive Location Map"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            src={mapIframeUrl}
          />
          <div style={{
            position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(15, 23, 42, 0.9)',
            padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600
          }}>
            📍 Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}
          </div>
        </div>

        {/* Auto-filled Location Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div className="input-group">
            <label className="input-label" style={{ fontSize: '0.78rem' }}>City *</label>
            <input
              className="input"
              style={{ fontSize: '0.85rem' }}
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Islamabad"
            />
          </div>

          <div className="input-group">
            <label className="input-label" style={{ fontSize: '0.78rem' }}>Province</label>
            <input
              className="input"
              style={{ fontSize: '0.85rem' }}
              value={province}
              onChange={e => setProvince(e.target.value)}
              placeholder="e.g. Punjab"
            />
          </div>

          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label className="input-label" style={{ fontSize: '0.78rem' }}>Street Address / Landmark</label>
            <input
              className="input"
              style={{ fontSize: '0.85rem' }}
              value={addressText}
              onChange={e => setAddressText(e.target.value)}
              placeholder="e.g. Sector I-12, Near Main Gate, CMH Hospital"
            />
          </div>

          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label className="input-label" style={{ fontSize: '0.78rem' }}>Google Maps Link (Auto-Generated)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input"
                style={{ fontSize: '0.85rem', flex: 1 }}
                value={mapsUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                onChange={e => setMapsUrl(e.target.value)}
                placeholder="Google Maps URL"
              />
              <a
                href={mapsUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ textDecoration: 'none', color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <ExternalLink size={14} /> Preview
              </a>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleConfirm}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#10b981', color: '#fff' }}
          >
            <CheckCircle2 size={16} /> Confirm & Fill Location
          </button>
        </div>
      </div>
    </div>
  );
}
