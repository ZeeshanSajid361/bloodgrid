/**
 * ResetPasswordPage — step 2 of the password reset flow.
 *
 * Reads ?token=xxx from the URL, lets user enter a new password,
 * then POST /api/auth/reset-password { token, password }
 */

import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';
import { BrandPanel } from './RegisterPage';
import '../../styles/auth.css';

export default function ResetPasswordPage() {
  const [searchParams]            = useSearchParams();
  const navigate                  = useNavigate();
  const token                     = searchParams.get('token') || '';

  const [password,     setPassword]     = useState('');
  const [confirmPass,  setConfirmPass]  = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [done,         setDone]         = useState(false);
  const [apiError,     setApiError]     = useState('');

  if (!token) {
    return (
      <div className="auth-layout">
        <BrandPanel />
        <div className="auth-form-panel">
          <div className="auth-form-card">
            <div className="auth-form-header">
              <h1>Invalid Link</h1>
              <p>This password reset link is missing or malformed.</p>
            </div>
            <Link to="/forgot-password" className="btn btn-primary btn-full mt-6">
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');

    if (password.length < 8) {
      setApiError('Password must be at least 8 characters.'); return;
    }
    if (password !== confirmPass) {
      setApiError('Passwords do not match.'); return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setApiError(err.response?.data?.message || 'Reset failed. The link may have expired.');
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
            <h1>Set New Password</h1>
            <p>Choose a strong password for your account.</p>
          </div>

          {done ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
              <CheckCircle2 size={48} style={{ color: 'var(--color-success)', marginBottom: 'var(--space-4)' }} />
              <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-3)' }}>Password updated!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Redirecting you to sign in…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-4">
                <div className="input-group">
                  <label className="input-label" htmlFor="rp-password">
                    New password <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="rp-password"
                      type={showPass ? 'text' : 'password'}
                      className="input has-icon"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="new-password"
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      style={{
                        position: 'absolute', right: 12, top: '50%',
                        transform: 'translateY(-50%)', background: 'transparent',
                        border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', padding: 4, zIndex: 10,
                      }}
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="rp-confirm">
                    Confirm password <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="rp-confirm"
                      type={showPass ? 'text' : 'password'}
                      className="input has-icon"
                      placeholder="Re-enter password"
                      value={confirmPass}
                      onChange={e => setConfirmPass(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              {apiError && (
                <div className="flex items-center gap-2 mt-4" style={{ color: 'var(--red-400)', fontSize: '0.875rem' }}>
                  <AlertCircle size={16} /><span>{apiError}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-full mt-6"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : 'Update password'}
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
