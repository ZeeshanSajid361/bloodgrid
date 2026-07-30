/**
 * QRVerifyPage — Phase 7
 *
 * Opened when an admin or hospital staff scans a donor's QR code.
 * The URL format is: /qr/verify/:token
 *
 * This page:
 *   1. Calls GET /api/qr/verify/:token on mount.
 *   2. Shows a loading spinner while the server validates the token.
 *   3. On success → shows the fulfillment summary (donor name, blood group, etc.)
 *   4. On error   → shows a clear error (expired, already used, invalid).
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Home, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import '../../styles/auth.css';   // reuse auth page shell for centred layout
import './QRVerifyPage.css';

export default function QRVerifyPage() {
  const { token } = useParams();
  const [state, setState]  = useState('loading'); // loading | success | error
  const [data,  setData]   = useState(null);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrMsg('Invalid QR code. No token provided.');
      return;
    }

    api.get(`/qr/verify/${token}`)
      .then(res => {
        setData(res.data.data);
        setState('success');
      })
      .catch(err => {
        setErrMsg(
          err.response?.data?.message ||
          'Something went wrong. Please try again or ask the donor to regenerate the QR code.'
        );
        setState('error');
      });
  }, [token]);

  return (
    <div className="qr-verify-page">
      <div className="qr-verify-card">
        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div className="qr-verify-brand">
          <div className="qr-verify-logo">🩸</div>
          <span>BloodLink</span>
        </div>

        {/* ── Loading ───────────────────────────────────────────────────── */}
        {state === 'loading' && (
          <div className="qr-verify-body qr-verify-loading">
            <Loader2 size={40} className="spin" style={{ color: 'var(--red-400)' }} />
            <p>Verifying donation token…</p>
          </div>
        )}

        {/* ── Success ───────────────────────────────────────────────────── */}
        {state === 'success' && data && (
          <div className="qr-verify-body qr-verify-success">
            <CheckCircle2 size={56} className="qr-verify-icon success" />
            <h2>Donation Confirmed!</h2>
            <p className="qr-verify-sub">The blood request has been marked as fulfilled.</p>

            <div className="qr-verify-details">
              <div className="qr-detail-row">
                <span className="qr-detail-label">Donor</span>
                <span className="qr-detail-value">{data.donor?.name}</span>
              </div>
              <div className="qr-detail-row">
                <span className="qr-detail-label">Blood Group</span>
                <span className="qr-detail-value blood-group-highlight">{data.bloodGroup}</span>
              </div>
              <div className="qr-detail-row">
                <span className="qr-detail-label">Hospital</span>
                <span className="qr-detail-value">{data.hospitalName}</span>
              </div>
              <div className="qr-detail-row">
                <span className="qr-detail-label">Verified At</span>
                <span className="qr-detail-value">
                  {new Date(data.fulfilledAt).toLocaleString('en-PK')}
                </span>
              </div>
            </div>

            <p className="qr-verify-note">
              The donor and seeker have been notified automatically.
            </p>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {state === 'error' && (
          <div className="qr-verify-body qr-verify-error">
            {errMsg.includes('already used') || errMsg.includes('expired')
              ? <AlertTriangle size={56} className="qr-verify-icon warning" />
              : <XCircle       size={56} className="qr-verify-icon error"   />
            }
            <h2>Verification Failed</h2>
            <p className="qr-verify-sub">{errMsg}</p>
          </div>
        )}

        {/* ── Footer link ───────────────────────────────────────────────── */}
        <div className="qr-verify-footer">
          <Link to="/" className="qr-verify-home">
            <Home size={14} /> Back to BloodLink
          </Link>
        </div>
      </div>
    </div>
  );
}
