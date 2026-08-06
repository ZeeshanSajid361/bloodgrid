/**
 * ForgotPasswordPage — step 1 of the password reset flow.
 *
 * POST /api/auth/forgot-password   { email }
 * Features a 10-minute token expiration and a persistent 60-second resend cooldown timer.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';
import api from '../../lib/api';
import { BrandPanel } from './RegisterPage';
import '../../styles/auth.css';

const COOLDOWN_SECONDS = 60;
const STORAGE_KEY_TS    = 'bloodsync_reset_ts';
const STORAGE_KEY_EMAIL = 'bloodsync_reset_email';

export default function ForgotPasswordPage() {
  const [email,       setEmail]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [sent,        setSent]        = useState(false);
  const [apiError,    setApiError]    = useState('');
  const [cooldown,    setCooldown]    = useState(0);

  // Restore cooldown state from localStorage on page refresh
  useEffect(() => {
    const storedTs    = localStorage.getItem(STORAGE_KEY_TS);
    const storedEmail = localStorage.getItem(STORAGE_KEY_EMAIL);

    if (storedTs && storedEmail) {
      const elapsed = Math.floor((Date.now() - parseInt(storedTs, 10)) / 1000);
      if (elapsed < COOLDOWN_SECONDS) {
        setCooldown(COOLDOWN_SECONDS - elapsed);
        setEmail(storedEmail);
        setSent(true);
      } else {
        localStorage.removeItem(STORAGE_KEY_TS);
      }
    }
  }, []);

  // Cooldown countdown tick
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            localStorage.removeItem(STORAGE_KEY_TS);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSend(e) {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) { setApiError('Please enter your email address.'); return; }
    
    setLoading(true);
    setApiError('');
    try {
      await api.post('/auth/forgot-password', { email: cleanEmail });
      
      // Save timestamp and email to localStorage so browser refresh doesn't bypass cooldown
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY_TS, now.toString());
      localStorage.setItem(STORAGE_KEY_EMAIL, cleanEmail);

      setSent(true);
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to send reset link. Please check your email and try again.');
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
            <p>Enter your account email to receive a 10-minute reset link.</p>
          </div>

          {sent ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
              <CheckCircle2 size={48} style={{ color: 'var(--color-success)', marginBottom: 'var(--space-4)' }} />
              <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-3)' }}>Reset link dispatched!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-4)' }}>
                A secure password reset link has been sent to <strong>{email}</strong>.
                <br />
                <span style={{ fontSize: '0.8rem', color: 'var(--red-300)', fontWeight: 600, display: 'inline-block', marginTop: '6px' }}>
                  ⏱️ Link is valid for 10 minutes. Any new request invalidates previous links.
                </span>
              </p>

              {apiError && (
                <div style={{ color: 'var(--red-400)', fontSize: '0.85rem', marginBottom: 'var(--space-4)' }}>
                  <AlertCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
                  {apiError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={() => handleSend()}
                  disabled={loading || cooldown > 0}
                >
                  {loading ? (
                    <span className="spinner" />
                  ) : cooldown > 0 ? (
                    <>Resend reset link in {cooldown}s</>
                  ) : (
                    <><RotateCw size={16} /> Resend reset link</>
                  )}
                </button>

                <Link to="/login" className="btn btn-ghost btn-full">Back to Sign In</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSend} noValidate>
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
                {loading ? <span className="spinner" /> : 'Send 10-Min Reset Link'}
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
