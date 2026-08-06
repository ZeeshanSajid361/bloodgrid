/**
 * ForgotPasswordPage — step 1 of the password reset flow.
 *
 * POST /api/auth/forgot-password   { email }
 * The server sends a reset link to the email (always returns 200 to avoid enumeration).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';
import { BrandPanel } from './RegisterPage';
import '../../styles/auth.css';

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [apiError,  setApiError]  = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setApiError('Please enter your email address.'); return; }
    setLoading(true);
    setApiError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      // Always show generic success to prevent email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      <BrandPanel />

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h1>Reset Password</h1>
            <p>Enter your account email and we'll send you a reset link.</p>
          </div>

          {sent ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
              <CheckCircle2 size={48} style={{ color: 'var(--color-success)', marginBottom: 'var(--space-4)' }} />
              <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-3)' }}>Check your inbox</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-6)' }}>
                If <strong>{email}</strong> is registered, a reset link has been sent.
                Check your spam folder if you don't see it within a minute.
              </p>
              <Link to="/login" className="btn btn-primary btn-full">Back to Sign In</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="input-group">
                <label className="input-label" htmlFor="fp-email">
                  Email address <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    id="fp-email"
                    type="email"
                    className={`input has-icon${apiError ? ' error' : ''}`}
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setApiError(''); }}
                    autoComplete="email"
                  />
                </div>
                {apiError && (
                  <span className="input-error-msg"><AlertCircle size={13} />{apiError}</span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full mt-6"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : 'Send reset link'}
              </button>

              <div className="auth-form-footer" style={{ marginTop: 'var(--space-5)' }}>
                <Link to="/login">← Back to Sign In</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
