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
import { Loader2, QrCode, RefreshCw, Download, CheckCircle2, X, Clock } from 'lucide-react';
import useQR from '../hooks/useQR';
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

export default function QRCheckIn({ requestId, requestStatus, hospitalName, bloodGroup }) {
  const { qrData, generating, cancelling, error, generate, cancel } = useQR(requestId, requestStatus);
  const [expanded, setExpanded] = useState(false);

  // Only show for approved requests
  if (requestStatus !== 'approved') return null;

  function handleDownload() {
    const canvas = document.querySelector(`#qr-canvas-${requestId}`);
    if (!canvas) return;
    
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `bloodlink-qr-${requestId}.png`;
    a.click();
  }

  if (!expanded) {
    return (
      <button className="qr-expand-btn" onClick={() => setExpanded(true)}>
        <QrCode size={14} />
        {qrData?.isUsed ? 'Donation Verified ✓' : 'Show Donation QR'}
      </button>
    );
  }

  return (
    <div className="qr-panel">
      <div className="qr-panel-header">
        <div className="qr-panel-title">
          <QrCode size={16} /> Donation QR Check-in
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
              Show this QR code to the hospital staff when you arrive. They will scan it to confirm your donation.
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

            <div className="qr-actions">
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
            <button className="btn btn-secondary" onClick={generate} disabled={generating} style={{ width: '100%', justifyContent: 'center' }}>
              {generating
                ? <><Loader2 size={16} className="spin" /> Generating…</>
                : <><QrCode size={16} /> Generate Donation QR</>
              }
            </button>
          </>
        )}
      </div>
    </div>
  );
}
