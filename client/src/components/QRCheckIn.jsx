/**
 * QRCheckIn — Phase 7
 *
 * Shown inside the DonorDashboard History tab for each "approved" request.
 * Lets the donor generate a one-time QR code to present at the hospital;
 * the hospital/admin scans it to mark the request as fulfilled.
 *
 * States:
 *   - No token yet         → "Generate QR" button
 *   - Token active         → QR image + expiry + "Regenerate" + download
 *   - Token used (fulfilled) → success state with confetti-like message
 *   - Token expired        → prompt to regenerate
 */

import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Loader2, QrCode, RefreshCw, Download, CheckCircle2, X, Clock, Navigation, Car } from 'lucide-react';
import useQR from '../hooks/useQR';
import api from '../lib/api';
import './QRCheckIn.css';

function formatExpiry(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d - now;
  if (diffMs <= 0) return 'Expired';
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

export default function QRCheckIn({ requestId, requestStatus, hospitalName, hospitalCity, bloodGroup, commitments = [] }) {
  const { qrData, generating, cancelling, error, generate, cancel } = useQR(requestId, requestStatus);
  const [expanded, setExpanded] = useState(false);
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(false);
  const [commitError, setCommitError] = useState(null);

  // Only show for approved requests
  if (requestStatus !== 'approved') return null;

  async function handlePledge(etaMinutes) {
    setCommitting(true);
    setCommitError(null);
    try {
      await api.post(`/donors/requests/${requestId}/commit`, { etaMinutes });
      setCommitSuccess(true);
      setShowEtaModal(false);
      generate(); // Auto-generate QR code upon commitment
    } catch (err) {
      setCommitError(err.response?.data?.message || 'Failed to reserve slot.');
    } finally {
      setCommitting(false);
    }
  }

  function handleDownload() {
    const canvas = document.querySelector(`#qr-canvas-${requestId}`);
    if (!canvas) return;
    
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `bloodsync-qr-${requestId}.png`;
    a.click();
  }

  const mapsQuery = encodeURIComponent(`${hospitalName}${hospitalCity ? ', ' + hospitalCity : ''}`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  if (!expanded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
        <button className="qr-expand-btn" onClick={() => setExpanded(true)}>
          <QrCode size={14} />
          {qrData?.isUsed ? 'Donation Verified ✓' : 'Show Donation QR & Navigation'}
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowEtaModal(true)}
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', gap: '6px' }}
        >
          <Car size={14} /> I&apos;m On My Way to Donate
        </button>

        {/* ETA Selection Modal */}
        {showEtaModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 'var(--space-4)'
          }}>
            <div className="card animate-scale-up" style={{ maxWidth: 420, width: '100%', padding: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Car size={18} color="#10b981" /> Reserve Slot & En Route ETA
                </h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowEtaModal(false)}><X size={16} /></button>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                Select your estimated travel time to <strong>{hospitalName}</strong>. This temporarily locks 1 blood unit slot for you so no other donor travels at the same time.
              </p>

              {commitError && <div style={{ color: 'var(--red-400)', fontSize: '0.85rem', marginBottom: 'var(--space-3)' }}>{commitError}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                {[15, 30, 45, 60].map(mins => (
                  <button
                    key={mins}
                    className="btn btn-secondary"
                    disabled={committing}
                    onClick={() => handlePledge(mins)}
                    style={{ padding: 'var(--space-3)', flexDirection: 'column', gap: '2px', textAlign: 'center' }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#10b981' }}>⏱️ {mins} Mins</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Slot locked for {mins}m</span>
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                💡 If your travel timer expires without scanning at the hospital counter, the slot will auto-unlock for other donors.
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="qr-panel">
      <div className="qr-panel-header">
        <div className="qr-panel-title">
          <QrCode size={16} /> Donation QR Check-in & Navigation
        </div>
        <button className="qr-close-btn" onClick={() => setExpanded(false)}>
          <X size={16} />
        </button>
      </div>

      <div className="qr-panel-body">
        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div className="qr-error">{error}</div>
        )}

        {/* ── Token Used (Fulfilled) ────────────────────────────────────── */}
        {qrData?.isUsed && (
          <div className="qr-fulfilled">
            <CheckCircle2 size={40} className="qr-fulfilled-icon" />
            <h4>Donation Confirmed!</h4>
            <p>
              Your donation of <strong>{bloodGroup}</strong> blood at{' '}
              <strong>{hospitalName}</strong> has been verified by the hospital.
            </p>
            <p className="qr-fulfilled-date">
              Verified on {new Date(qrData.usedAt).toLocaleString('en-PK')}
            </p>
          </div>
        )}

        {/* ── Token Expired ─────────────────────────────────────────────── */}
        {qrData && qrData.isExpired && !qrData.isUsed && (
          <div className="qr-expired">
            <Clock size={32} />
            <p>This QR code has expired. Generate a new one when you arrive at the hospital.</p>
            <button className="btn btn-secondary btn-sm" onClick={generate} disabled={generating || cancelling}>
              {generating ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
              Regenerate
            </button>
          </div>
        )}

        {/* ── Active Token ──────────────────────────────────────────────── */}
        {qrData && !qrData.isExpired && !qrData.isUsed && (
          <>
            <div className="qr-instructions">
              Show this QR code to the hospital staff when you arrive at <strong>{hospitalName}</strong>. They will scan it to confirm your donation.
            </div>

            <div className="qr-code-wrap">
              <QRCodeCanvas
                id={`qr-canvas-${requestId}`}
                value={qrData.verifyUrl}
                size={220}
                level="H"
                includeMargin={true}
                fgColor="#1a1a2e"
                bgColor="#ffffff"
              />
            </div>

            <div className="qr-expiry">
              <Clock size={13} /> {formatExpiry(qrData.expiresAt)}
            </div>

            <div className="qr-actions" style={{ flexWrap: 'wrap' }}>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{ background: '#3b82f6', border: 'none', textDecoration: 'none' }}
              >
                <Navigation size={14} /> Open GPS Navigation (Google Maps)
              </a>
              <button className="btn btn-ghost btn-sm" onClick={handleDownload}>
                <Download size={14} /> Save QR
              </button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red-400)' }}
                onClick={cancel} disabled={cancelling}>
                {cancelling ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                Regenerate
              </button>
            </div>
          </>
        )}

        {/* ── No Token Yet ──────────────────────────────────────────────── */}
        {!qrData && (
          <>
            <div className="qr-instructions">
              Your request for <strong>{bloodGroup}</strong> blood at <strong>{hospitalName}</strong> has been approved!
              Generate a QR code when you&apos;re ready to go to the hospital.
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexDirection: 'column' }}>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ justifyContent: 'center', textDecoration: 'none' }}
              >
                <Navigation size={16} /> Open GPS Navigation to Hospital
              </a>
              <button className="btn btn-primary" onClick={generate} disabled={generating} style={{ justifyContent: 'center' }}>
                {generating
                  ? <><Loader2 size={16} className="spin" /> Generating…</>
                  : <><QrCode size={16} /> Generate Donation QR</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
