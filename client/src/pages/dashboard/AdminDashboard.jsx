/**
 * AdminDashboard — Phase 5
 * Tabs: Overview · Hospitals · Requests · Users
 */

import { useState, useEffect } from 'react';
import {
  ShieldCheck, Building2, FileText, Users, LogOut,
  CheckCircle, XCircle, Key, Lock, Unlock, ExternalLink,
  Loader2, AlertTriangle, TrendingUp, Menu, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useAdminData from '../../hooks/useAdminData';
import useNotifications from '../../hooks/useNotifications';
import NotificationBell from '../../components/NotificationBell';
import { getViewableDocUrl, isPdfUrl } from '../../lib/docUrl';
import '../../styles/admin.css';

/* ── shared note modal ───────────────────────────────────────────────────── */
function NoteModal({ title, description, onConfirm, onClose, loading, isReject }) {
  const [note, setNote] = useState('');
  return (
    <div className="admin-note-modal" onClick={onClose}>
      <div className="admin-note-dialog" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="input-label">{isReject ? 'Reason (required)' : 'Note (optional)'}</label>
          <textarea
            className="input"
            rows={3}
            style={{ resize: 'vertical' }}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={isReject ? 'Explain why this is being rejected…' : 'Optional message for the applicant…'}
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button
            className={`btn btn-sm ${isReject ? 'btn-danger' : 'btn-secondary'}`}
            disabled={loading || (isReject && !note.trim())}
            onClick={() => onConfirm(note)}
          >
            {loading ? <Loader2 size={15} className="spin" /> : isReject ? 'Reject' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── API key reveal modal ────────────────────────────────────────────────── */
function ApiKeyModal({ apiKey, orgName, onClose }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="admin-note-modal" onClick={onClose}>
      <div className="admin-note-dialog" onClick={e => e.stopPropagation()}>
        <h3>🔑 API Key Issued</h3>
        <p>
          Copy and share this key with <strong>{orgName}</strong>. It is shown
          only once and cannot be retrieved again.
        </p>
        <div style={{
          background: 'var(--surface-base)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          wordBreak: 'break-all',
          color: 'var(--blue-300)',
          marginBottom: 'var(--space-5)',
        }}>
          {apiKey}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={copy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

/* ══ OVERVIEW TAB ════════════════════════════════════════════════════════ */
function OverviewTab({ admin }) {
  const { fetchAnalytics, analytics, loading } = admin;

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading || !analytics) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--space-12)' }}><Loader2 size={28} className="spin" style={{ color: 'var(--red-400)' }} /></div>;
  }

  const { users, requests, orgs, inventory } = analytics;

  return (
    <>
      {/* Stat Cards - 2 side-by-side on mobile */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Users</div>
          <div className="admin-stat-value">{users.total}</div>
          <div className="admin-stat-sub">{users.donors} donors · {users.seekers} seekers</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Blood Requests</div>
          <div className="admin-stat-value">{requests.total}</div>
          <div className="admin-stat-sub">{requests.pending} pending review</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Organisations</div>
          <div className="admin-stat-value">{orgs.total}</div>
          <div className="admin-stat-sub">{orgs.approved} approved</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Units</div>
          <div className="admin-stat-value">{inventory.totalUnits}</div>
          <div className="admin-stat-sub">across all hospitals</div>
        </div>
      </div>

      <div className="admin-overview-grid">
        {/* Low Stock Alerts */}
        <div className="admin-section-card">
          <h3 className="admin-card-title">
            <AlertTriangle size={16} style={{ color: 'var(--red-400)' }} /> Low Stock Alerts
          </h3>
          {inventory.lowStock.length === 0
            ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>All stock levels are adequate.</p>
            : <div className="low-stock-grid-2">
                {inventory.lowStock.map((item, i) => (
                  <div key={i} className="low-stock-card-compact">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="badge badge-red" style={{ fontWeight: 800 }}>{item.bloodGroup}</span>
                      <span style={{ fontWeight: 700, color: 'var(--red-400)', fontSize: '0.8rem' }}>{item.units} units</span>
                    </div>
                    <div className="card-sub-text">{item.orgName}</div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Recent Activity Feed - 2 side-by-side cards on mobile */}
        <div className="admin-section-card">
          <h3 className="admin-card-title">
            <TrendingUp size={16} style={{ color: 'var(--blue-400)' }} /> Recent Requests
          </h3>
          {requests.recent.length === 0
            ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No recent requests.</p>
            : <div className="activity-grid-2">
                {requests.recent.map(r => (
                  <div key={r._id} className="activity-card-compact">
                    <div className="activity-card-top">
                      <div className="activity-card-left">
                        <span className={`activity-dot ${r.urgency === 'critical' ? 'critical' : r.urgency === 'urgent' ? 'urgent' : 'routine'}`} />
                        <span className="badge badge-red" style={{ fontWeight: 800, padding: '1px 5px', fontSize: '0.72rem' }}>{r.bloodGroup}</span>
                      </div>
                      <span className={`badge badge-${r.status === 'pending_review' ? 'amber' : r.status === 'approved' ? 'blue' : r.status === 'fulfilled' ? 'green' : 'red'}`} style={{ fontSize: '0.65rem' }}>
                        {r.status === 'pending_review' ? 'Pending' : r.status}
                      </span>
                    </div>
                    <div className="activity-patient-name">{r.patientName}</div>
                    <div className="activity-hospital-name">{r.hospital}</div>
                    <div className="activity-date-str">{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </>
  );
}

/* ══ HOSPITALS TAB ═══════════════════════════════════════════════════════ */
function HospitalsTab({ admin }) {
  const { fetchHospitals, hospitals, verifyHospital, generateApiKey, revokeApiKey, loading } = admin;
  const [statusFilter, setStatusFilter] = useState('pending');
  const [modal,        setModal]        = useState(null);
  const [issuedKey,    setIssuedKey]    = useState(null);
  const [acting,       setActing]       = useState(false);

  useEffect(() => { fetchHospitals(statusFilter); }, [fetchHospitals, statusFilter]);

  async function handleAction(note) {
    if (!modal) return;
    setActing(true);
    try {
      if (modal.type === 'approve') {
        await verifyHospital(modal.org._id, 'approved', note);
      } else if (modal.type === 'reject') {
        await verifyHospital(modal.org._id, 'rejected', note);
      }
      setModal(null);
      fetchHospitals(statusFilter);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    } finally { setActing(false); }
  }

  async function handleApiKey(org) {
    if (org.hasApiKey) {
      if (!confirm(`Revoke API key for ${org.name}? Integrations using this key will fail immediately.`)) return;
      try {
        await revokeApiKey(org._id);
        fetchHospitals(statusFilter);
      } catch (err) { alert(err.response?.data?.message || 'Revoke failed.'); }
    } else {
      try {
        const { apiKey } = await generateApiKey(org._id);
        setIssuedKey({ apiKey, orgName: org.name });
        fetchHospitals(statusFilter);
      } catch (err) { alert(err.response?.data?.message || 'Generation failed.'); }
    }
  }

  const STATUSES = ['pending', 'approved', 'rejected', ''];

  return (
    <>
      {issuedKey && (
        <ApiKeyModal apiKey={issuedKey.apiKey} orgName={issuedKey.orgName} onClose={() => setIssuedKey(null)} />
      )}

      <div className="admin-table-wrap">
        <div className="admin-table-toolbar">
          <h3>Hospital & Partner Verification</h3>
          <div className="admin-filter-group">
            {STATUSES.map(s => (
              <button
                key={s || 'all'}
                className={`admin-filter-chip${statusFilter === s ? ' active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading
          ? <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}><Loader2 size={22} className="spin" /></div>
          : <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ minWidth: '650px' }}>
                <thead>
                  <tr>
                    <th>Organisation</th>
                    <th>Type</th>
                    <th>City / Address</th>
                    <th>License</th>
                    <th>Status</th>
                    <th>API Key</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitals.orgs.length === 0
                    ? <tr><td colSpan={7} className="admin-empty">No organisations found.</td></tr>
                    : hospitals.orgs.map(org => (
                        <tr key={org._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{org.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{org.email}</div>
                          </td>
                          <td>
                            <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{org.type}</span>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {org.city}{org.address ? ` · ${org.address}` : ''}
                          </td>
                          <td>
                            {org.licenseDoc ? (
                              <a
                                className="doc-link"
                                href={getViewableDocUrl(org.licenseDoc)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink size={13} /> {isPdfUrl(org.licenseDoc) ? 'View License (PDF)' : 'View Document'}
                              </a>
                            ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No doc</span>}
                          </td>
                          <td>
                            <span className={`badge badge-${org.status === 'approved' ? 'green' : org.status === 'pending' ? 'amber' : 'red'}`}>
                              {org.status}
                            </span>
                          </td>
                          <td>
                            {org.status === 'approved' ? (
                              <button
                                className={`btn btn-sm ${org.hasApiKey ? 'btn-ghost' : 'btn-secondary'}`}
                                style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                                onClick={() => handleApiKey(org)}
                              >
                                <Key size={12} /> {org.hasApiKey ? 'Revoke Key' : 'Issue Key'}
                              </button>
                            ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>}
                          </td>
                          <td>
                            <div className="admin-actions">
                              {org.status !== 'approved' && (
                                <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} onClick={() => setModal({ type: 'approve', org })}>
                                  <CheckCircle size={13} /> Approve
                                </button>
                              )}
                              {org.status !== 'rejected' && (
                                <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => setModal({ type: 'reject', org })}>
                                  <XCircle size={13} /> Reject
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
        }
      </div>

      {modal?.type === 'approve' && (
        <NoteModal
          title={`Approve ${modal.org.name}`}
          description="The hospital will be granted full inventory management access and visible to seekers."
          onConfirm={handleAction} onClose={() => setModal(null)} loading={acting}
        />
      )}
      {modal?.type === 'reject' && (
        <NoteModal
          title={`Reject ${modal.org.name}`}
          description="Please provide a clear reason. The hospital admin will see this in their dashboard."
          onConfirm={handleAction} onClose={() => setModal(null)} loading={acting} isReject
        />
      )}
    </>
  );
}

/* ══ REQUESTS TAB ═════════════════════════════════════════════════════════ */
function RequestsTab({ admin }) {
  const { fetchRequests, requests, reviewRequest, loading } = admin;
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [modal,        setModal]        = useState(null);
  const [acting,       setActing]       = useState(false);

  useEffect(() => { fetchRequests(statusFilter); }, [fetchRequests, statusFilter]);

  async function handleAction(note) {
    if (!modal) return;
    setActing(true);
    try {
      const action = modal.type === 'approve' ? 'approve' : modal.type === 'reject' ? 'reject' : 'fulfill';
      await reviewRequest(modal.req._id, action, note);
      setModal(null);
      fetchRequests(statusFilter);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    } finally { setActing(false); }
  }

  const STATUSES = ['pending_review', 'approved', 'fulfilled', 'rejected', ''];

  return (
    <>
      <div className="admin-table-wrap">
        <div className="admin-table-toolbar">
          <h3>Blood Request Queue</h3>
          <div className="admin-filter-group">
            {STATUSES.map(s => (
              <button
                key={s || 'all'}
                className={`admin-filter-chip${statusFilter === s ? ' active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s ? s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading
          ? <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}><Loader2 size={22} className="spin" /></div>
          : <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ minWidth: '700px' }}>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Hospital</th>
                    <th>Units</th>
                    <th>Urgency</th>
                    <th>Doc</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.requests.length === 0
                    ? <tr><td colSpan={7} className="admin-empty">No blood requests found.</td></tr>
                    : requests.requests.map(r => (
                        <tr key={r._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.patientName}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Seeker: {r.seekerId?.name || '—'}</div>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {r.hospital}{r.city ? ` (${r.city})` : ''}
                          </td>
                          <td>
                            <span className="badge badge-red" style={{ fontWeight: 800 }}>{r.bloodGroup}</span>
                            <span style={{ fontSize: '0.85rem', marginLeft: 4 }}>× {r.unitsNeeded}</span>
                          </td>
                          <td>
                            <span className={`badge badge-${r.urgency === 'critical' ? 'red' : r.urgency === 'urgent' ? 'amber' : 'blue'}`}>
                              {r.urgency}
                            </span>
                          </td>
                          <td>
                            {r.prescriptionDoc ? (
                              <a
                                className="doc-link"
                                href={getViewableDocUrl(r.prescriptionDoc)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink size={13} /> {isPdfUrl(r.prescriptionDoc) ? 'Prescription (PDF)' : 'Document'}
                              </a>
                            ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>}
                          </td>
                          <td>
                            <span className={`badge badge-${r.status === 'pending_review' ? 'amber' : r.status === 'approved' ? 'blue' : r.status === 'fulfilled' ? 'green' : 'red'}`}>
                              {r.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <div className="admin-actions">
                              {r.status === 'pending_review' && <>
                                <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} onClick={() => setModal({ type: 'approve', req: r })}>
                                  <CheckCircle size={13} />
                                </button>
                                <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => setModal({ type: 'reject', req: r })}>
                                  <XCircle size={13} />
                                </button>
                              </>}
                              {r.status === 'approved' && (
                                <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} onClick={() => { setModal({ type: 'fulfill', req: r }); handleAction(); }}>
                                  <CheckCircle size={13} /> Fulfilled
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
        }
      </div>

      {modal?.type === 'approve' && (
        <NoteModal
          title="Approve Request"
          description="The seeker will be notified that their request is approved and donors will be alerted in Phase 6."
          onConfirm={handleAction} onClose={() => setModal(null)} loading={acting}
        />
      )}
      {modal?.type === 'reject' && (
        <NoteModal
          title="Reject Request"
          description="The uploaded document will be deleted from Cloudinary. The seeker will see your reason."
          onConfirm={handleAction} onClose={() => setModal(null)} loading={acting} isReject
        />
      )}
    </>
  );
}

/* ══ USERS TAB ═══════════════════════════════════════════════════════════ */
function UsersTab({ admin }) {
  const { fetchUsers, users, toggleBlock, loading } = admin;
  const [roleFilter, setRoleFilter] = useState('');
  const [search,     setSearch]     = useState('');
  const [acting,     setActing]     = useState('');

  useEffect(() => { fetchUsers(roleFilter, search); }, [fetchUsers, roleFilter]);

  async function handleBlock(user) {
    setActing(user._id);
    try {
      await toggleBlock(user._id, !user.isBlocked);
      fetchUsers(roleFilter, search);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    } finally { setActing(''); }
  }

  function handleSearch(e) {
    e.preventDefault();
    fetchUsers(roleFilter, search);
  }

  const ROLES = ['', 'donor', 'seeker', 'hospital', 'admin'];

  return (
    <div className="admin-table-wrap">
      <div className="admin-table-toolbar">
        <h3>Users ({users.total})</h3>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="admin-filter-group">
            {ROLES.map(r => (
              <button key={r||'all'} className={`admin-filter-chip${roleFilter===r?' active':''}`} onClick={() => setRoleFilter(r)}>
                {r || 'All'}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input className="input" style={{ height: '32px', padding: '0 var(--space-3)', fontSize: '0.85rem', width: 180 }}
              placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
            <button type="submit" className="btn btn-ghost btn-sm">Search</button>
          </form>
        </div>
      </div>

      {loading
        ? <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}><Loader2 size={22} className="spin" /></div>
        : <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ minWidth: '650px' }}>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>City</th><th>Verified</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {users.users.length === 0
                  ? <tr><td colSpan={7} className="admin-empty">No users found.</td></tr>
                  : users.users.map(u => (
                      <tr key={u._id}>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                        <td><span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{u.role}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.city || '—'}</td>
                        <td>
                          {u.isEmailVerified
                            ? <CheckCircle size={15} style={{ color: 'var(--color-success)' }} />
                            : <XCircle size={15} style={{ color: 'var(--text-muted)' }} />}
                        </td>
                        <td>
                          <span className={`badge badge-${u.isBlocked ? 'red' : 'green'}`}>
                            {u.isBlocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                        <td>
                          {u.role !== 'admin' && (
                            <button
                              className={`btn btn-sm ${u.isBlocked ? 'btn-secondary' : 'btn-danger'}`}
                              style={{ padding: '4px 10px' }}
                              disabled={acting === u._id}
                              onClick={() => handleBlock(u)}
                            >
                              {acting === u._id
                                ? <Loader2 size={13} className="spin" />
                                : u.isBlocked
                                  ? <><Unlock size={13} /> Unblock</>
                                  : <><Lock size={13} /> Block</>
                              }
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
      }
    </div>
  );
}

/* ══ MAIN DASHBOARD ══════════════════════════════════════════════════════ */
const TABS = [
  { id: 'overview',  label: 'Overview',   icon: TrendingUp },
  { id: 'hospitals', label: 'Hospitals',  icon: Building2  },
  { id: 'requests',  label: 'Requests',   icon: FileText   },
  { id: 'users',     label: 'Users',      icon: Users      },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]   = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const admin           = useAdminData();
  const notifs          = useNotifications();

  // Badge counts for sidebar
  const pendingHospitals = admin.hospitals.orgs.filter(o => o.status === 'pending').length;
  const pendingRequests  = admin.requests.requests.filter(r => r.status === 'pending_review').length;

  useEffect(() => {
    admin.fetchHospitals('pending');
    admin.fetchRequests('pending_review');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-layout">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sticky Header (3 Parallel Bars icon + Brand + Fixed Notification Icon) */}
      <header className="admin-mobile-header">
        <button
          className="mobile-menu-toggle-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle options menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className="admin-mobile-brand">
          <div className="brand-icon"><ShieldCheck size={16} /></div>
          <span className="brand-name-text">BloodSync <span>Admin</span></span>
        </div>

        <div className="admin-mobile-actions">
          <NotificationBell {...notifs} />
        </div>
      </header>

      {/* Mobile Nav Tabs Bar */}
      <div className="admin-mobile-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`admin-mobile-tab${tab === id ? ' active' : ''}`}
            onClick={() => { setTab(id); setMobileMenuOpen(false); }}
          >
            <Icon size={15} />
            <span>{label}</span>
            {id === 'hospitals' && pendingHospitals > 0 && <span className="admin-nav-badge">{pendingHospitals}</span>}
            {id === 'requests'  && pendingRequests  > 0 && <span className="admin-nav-badge">{pendingRequests}</span>}
          </button>
        ))}
      </div>

      {/* Sidebar (Desktop & Mobile Drawer Menu) */}
      <aside className={`admin-sidebar${mobileMenuOpen ? ' mobile-open' : ''}`}>
        <div className="admin-brand">
          <div className="brand-icon"><ShieldCheck size={18} /></div>
          <div>
            <div className="brand-name">BloodSync Admin</div>
            <div className="brand-role">Control Panel</div>
          </div>
        </div>

        <nav className="admin-nav">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`admin-nav-item${tab === id ? ' active' : ''}`}
              onClick={() => { setTab(id); setMobileMenuOpen(false); }}
            >
              <Icon size={17} />
              {label}
              {id === 'hospitals' && pendingHospitals > 0 && <span className="admin-nav-badge">{pendingHospitals}</span>}
              {id === 'requests'  && pendingRequests  > 0 && <span className="admin-nav-badge">{pendingRequests}</span>}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div style={{ padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <NotificationBell {...notifs} />
          </div>
          <div style={{ padding: 'var(--space-3) var(--space-4)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
            {user?.name}
          </div>
          <button className="admin-nav-item" onClick={logout} style={{ color: 'var(--red-400)' }}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main animate-fade-up">
        <div className="admin-section-header">
          <h2>
            {tab === 'overview'  && 'Platform Overview'}
            {tab === 'hospitals' && 'Hospital & Partner Verification'}
            {tab === 'requests'  && 'Blood Request Review Queue'}
            {tab === 'users'     && 'User Management'}
          </h2>
        </div>

        {tab === 'overview'  && <OverviewTab  admin={admin} />}
        {tab === 'hospitals' && <HospitalsTab admin={admin} />}
        {tab === 'requests'  && <RequestsTab  admin={admin} />}
        {tab === 'users'     && <UsersTab     admin={admin} />}
      </main>
    </div>
  );
}
