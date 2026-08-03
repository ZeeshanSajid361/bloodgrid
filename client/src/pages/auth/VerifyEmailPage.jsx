/**
 * Email verification landing page.
 *
 * Reads the token from the URL query string and calls the verify-email
 * endpoint. Shows loading, success, or error states accordingly.
 */

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../lib/api';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  const calledRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link. Please check your email.');
      return;
    }

    if (calledRef.current) return;
    calledRef.current = true;

    api
      .post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
      });
  }, [token]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        background: 'var(--surface-base)',
      }}
    >
      <div
        className="card animate-fade-up text-center"
        style={{ maxWidth: 440, width: '100%', padding: 'var(--space-10)' }}
      >
        {status === 'verifying' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-5)' }}>
              <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
            </div>
            <h2>Verifying your email&hellip;</h2>
            <p className="mt-4">Please hold on while we activate your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-5)' }}>✅</div>
            <h2 style={{ color: 'var(--color-success)' }}>Email verified!</h2>
            <p className="mt-4">
              Your account is now active. You can sign in and start using BloodLink.
            </p>
            <Link to="/login" className="btn btn-primary btn-full mt-8">
              Go to Login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-5)' }}>❌</div>
            <h2 style={{ color: 'var(--color-error)' }}>Verification failed</h2>
            <p className="mt-4">{message}</p>
            <Link to="/register" className="btn btn-ghost btn-full mt-8">
              Back to Register
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
