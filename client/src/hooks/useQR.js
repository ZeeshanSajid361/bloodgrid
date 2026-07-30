/**
 * useQR — Phase 7
 *
 * Manages QR token state for a single approved blood request.
 * Used inside the DonorDashboard History tab.
 *
 * Returns:
 *   qrData      — { token, qrDataUrl, verifyUrl, expiresAt, usedAt, isUsed, isExpired } | null
 *   generating  — bool
 *   cancelling  — bool
 *   error       — string | null
 *   generate()  — POST /api/qr/generate
 *   cancel()    — DELETE /api/qr/:requestId
 */
import { useState, useCallback, useEffect } from 'react';
import api from '../lib/api';

export default function useQR(requestId, requestStatus) {
  const [qrData,     setQrData]     = useState(null);
  const [generating, setGenerating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error,      setError]      = useState(null);

  // Poll for existing token when component mounts (donor may have refreshed page)
  useEffect(() => {
    if (requestStatus !== 'approved' || !requestId) return;
    api.get(`/qr/${requestId}`)
      .then(r => setQrData(r.data.data))
      .catch(() => {}); // silently ignore — no token yet
  }, [requestId, requestStatus]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const { data } = await api.post('/qr/generate', { requestId });
      setQrData(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate QR code.');
    } finally {
      setGenerating(false);
    }
  }, [requestId]);

  const cancel = useCallback(async () => {
    setCancelling(true);
    setError(null);
    try {
      await api.delete(`/qr/${requestId}`);
      setQrData(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel QR code.');
    } finally {
      setCancelling(false);
    }
  }, [requestId]);

  return { qrData, generating, cancelling, error, generate, cancel };
}
