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

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Loader2, QrCode, RefreshCw, Download, CheckCircle2, X, Clock, Navigation, Car } from 'lucide-react';
import useQR from '../hooks/useQR';
import { useAuth } from '../context/AuthContext';
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

function getEtaConfig(urgency = 'routine') {
  const norm = (urgency || '').toLowerCase();
  if (norm === 'critical') {
    return {
      title: '🚨 Critical Emergency (Fast Response)',
      presets: [
        { label: '⚡ 15 Mins', mins: 15 },
        { label: '⏱️ 30 Mins', mins: 30 },
        { label: '🚗 45 Mins', mins: 45 },
        { label: '🚨 2 Hours', mins: 120 },
      ],
      maxMins: 120,
      maxLabel: '2 Hours Max (Critical Emergency)',
    };
  }
  if (norm === 'urgent') {
    return {
      title: '⚠️ Urgent Need (Same-day Transfusion)',
      presets: [
        { label: '⏱️ 30 Mins', mins: 30 },
        { label: '🚗 1 Hour', mins: 60 },
        { label: '🕒 2 Hours', mins: 120 },
        { label: '⚠️ 4 Hours', mins: 240 },
      ],
      maxMins: 240,
      maxLabel: '4 Hours Max (Urgent Case)',
    };
  }
  return {
    title: '🟢 Routine Need (Scheduled Procedure)',
    presets: [
      { label: '🚗 1 Hour', mins: 60 },
      { label: '🕒 2 Hours', mins: 120 },
      { label: '📅 6 Hours', mins: 360 },
      { label: '🗓️ 24 Hours', mins: 1440 },
    ],
    maxMins: 1440,
    maxLabel: '24 Hours Max (Routine Schedule)',
  };
}

export default function QRCheckIn({ requestId, requestStatus, hospitalName, hospitalCity, bloodGroup, commitments = [], urgency = 'routine', onCommitmentChange }) {
  const { user } = useAuth();
  const { qrData, generating, cancelling, error, generate, cancel } = useQR(requestId, requestStatus);
  const [expanded, setExpanded] = useState(false);
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [customVal, setCustomVal] = useState('');
  const [customUnit, setCustomUnit] = useState('mins'); // 'mins' or 'hours'
  const [committing, setCommitting] = useState(false);
  const [cancellingPledge, setCancellingPledge] = useState(false);
  const [commitError, setCommitError] = useState(null);
  const [localCommitment, setLocalCommitment] = useState(null);

  const etaConfig = getEtaConfig(urgency);

  // Active commitment for current donor
  const activeCommitment = localCommitment || (commitments || []).find(c => {
    const dId = String(c.donor?._id || c.donor || '');
    const uId = String(user?._id || user?.id || '');
    return dId && uId && dId === uId && c.status === 'en_route' && new Date(c.expiresAt) > new Date();
  });

  // Active commitment for another donor
  const otherCommitment = !activeCommitment && (commitments || []).find(c => {
    return c.status === 'en_route' && new Date(c.expiresAt) > new Date();
  });

  useEffect(() => {
    if (activeCommitment) {
      if (!qrData) generate();
    }
  }, [activeCommitment?._id, activeCommitment?.expiresAt]);

  // Only show for approved requests
  if (requestStatus !== 'approved') return null;

  async function handlePledge(etaMinutes) {
    const mins = parseInt(etaMinutes, 10);
    if (isNaN(mins) || mins <= 0) {
      return setCommitError('Please enter a valid time duration.');
    }
    if (mins > etaConfig.maxMins) {
      return setCommitError(`Maximum allowed lock duration for ${urgency.toUpperCase()} requests is ${etaConfig.maxLabel}.`);
    }

    setCommitting(true);
    setCommitError(null);
    try {
      const res = await api.post(`/donors/requests/${requestId}/commit`, { etaMinutes: mins });
      const updatedReq = res.data?.data;
      if (updatedReq?.commitments) {
        const myComm = updatedReq.commitments.find(c => String(c.donor?._id || c.donor) === String(user?._id || user?.id) && c.status === 'en_route');
        if (myComm) setLocalCommitment(myComm);
      } else {
        setLocalCommitment({
          expiresAt: new Date(Date.now() + mins * 60000),
          status: 'en_route'
        });
      }
      setShowEtaModal(false);
      setExpanded(true);
      generate(); // Auto-generate QR code upon commitment
      if (onCommitmentChange) onCommitmentChange();
    } catch (err) {
      setCommitError(err.response?.data?.message || err.message || 'Failed to reserve slot.');
    } finally {
      setCommitting(false);
    }
  }

  async function handleCancelPledge() {
    setCancellingPledge(true);
    try {
      await api.delete(`/donors/requests/${requestId}/commit`);
      setLocalCommitment(null);
      if (onCommitmentChange) onCommitmentChange();
    } catch (err) {
      console.error('Failed to cancel pledge:', err);
    } finally {
      setCancellingPledge(false);
    }
  }

  function handleCustomPledge(e) {
    e.preventDefault();
    const val = parseFloat(customVal);
    if (!val || val <= 0) return setCommitError('Please enter a valid duration.');
    const mins = customUnit === 'hours' ? Math.round(val * 60) : Math.round(val);
    handlePledge(mins);
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

        {activeCommitment ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.825rem',
              color: '#34d399',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Car size={15} /> ⏱️ En Route ({formatExpiry(activeCommitment.expiresAt)})
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleCancelPledge}
              disabled={cancellingPledge}
              style={{ color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.3)', padding: '4px 10px', fontSize: '0.75rem' }}
            >
              {cancellingPledge ? <Loader2 size={12} className="spin" /> : 'Cancel Pledge'}
            </button>
          </div>
        ) : otherCommitment ? (
          <div style={{
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '0.825rem',
            color: '#facc15',
            fontWeight: 600
          }}>
            🔒 1 Donor En Route (Locked)
          </div>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowEtaModal(true)}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', gap: '6px' }}
          >
            <Car size={14} /> I&apos;m On My Way to Donate
          </button>
        )}

        {/* High-Contrast Clean ETA Selection Modal via React Portal */}
        {showEtaModal && createPortal(
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '16px'
          }}>
            <div style={{
              background: '#151926',
              border: '1px solid #2d374e',
              borderRadius: '16px',
              maxWidth: 440,
              width: '100%',
              padding: '16px 20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              color: '#f8fafc',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Car size={18} color="#10b981" /> Reserve Slot & ETA
                </h3>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowEtaModal(false)}
                  style={{ color: '#94a3b8', padding: '2px 4px' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '0.78rem',
                color: '#34d399',
                marginBottom: '10px',
                fontWeight: 600,
              }}>
                {etaConfig.title}
              </div>

              <p style={{ fontSize: '0.825rem', color: '#cbd5e1', marginBottom: '10px', lineHeight: 1.35 }}>
                Select your estimated arrival time at <strong>{hospitalName}</strong>. This temporarily locks 1 blood unit slot for you.
              </p>

              {commitError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  marginBottom: '10px'
                }}>
                  ⚠️ {commitError}
                </div>
              )}

              {/* Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {etaConfig.presets.map(p => (
                  <button
                    key={p.mins}
                    disabled={committing}
                    onClick={() => handlePledge(p.mins)}
                    style={{
                      background: '#1e2638',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 6px',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#10b981'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.925rem', color: '#34d399' }}>{p.label}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Slot locked for {p.mins >= 60 ? `${p.mins / 60}h` : `${p.mins}m`}</span>
                  </button>
                ))}
              </div>

              {/* Custom ETA Entry */}
              <form onSubmit={handleCustomPledge} style={{ borderTop: '1px solid #2d374e', paddingTop: '10px', marginBottom: '10px' }}>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                  ✏️ Enter Custom Travel Time
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 45"
                    value={customVal}
                    onChange={e => setCustomVal(e.target.value)}
                    style={{
                      flex: 1,
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#ffffff',
                      padding: '6px 10px',
                      fontSize: '0.825rem',
                    }}
                  />
                  <select
                    value={customUnit}
                    onChange={e => setCustomUnit(e.target.value)}
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#ffffff',
                      padding: '6px',
                      fontSize: '0.825rem',
                    }}
                  >
                    <option value="mins">Minutes</option>
                    <option value="hours">Hours</option>
                  </select>
                  <button
                    type="submit"
                    disabled={committing || !customVal}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#10b981', border: 'none', whiteSpace: 'nowrap', padding: '6px 12px' }}
                  >
                    {committing ? <Loader2 size={13} className="spin" /> : 'Set ETA'}
                  </button>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '3px' }}>
                  Max limit: {etaConfig.maxLabel}
                </span>
              </form>

              <div style={{ fontSize: '0.725rem', color: '#64748b', textAlign: 'center', borderTop: '1px dashed #2d374e', paddingTop: '8px' }}>
                💡 Timer auto-releases if QR is not scanned at hospital counter before expiration.
              </div>
            </div>
          </div>,
          document.body
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
