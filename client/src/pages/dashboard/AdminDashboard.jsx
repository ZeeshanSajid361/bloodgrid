/**
 * AdminDashboard — Phase 5
 * Tabs: Overview · Hospitals · Requests · Users
 */

import { useState, useEffect } from 'react';
import {
  ShieldCheck, Building2, FileText, Users, LogOut,
  CheckCircle, XCircle, Key, Lock, Unlock, ExternalLink,
  Loader2, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useAdminData from '../../hooks/useAdminData';
import useNotifications from '../../hooks/useNotifications';
import NotificationBell from '../../components/NotificationBell';
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

  const { users, requests, organisations, inventory, recentRequests } = analytics;
  const byRole   = Object.fromEntries((users.byRole   || []).map(r => [r._id, r.count]));
  const byStatus = Object.fromEntries((requests.byStatus || []).map(r => [r._id, r.count]));

  return (
    <>
      <div className="admin-stats">
        {[
          { label: 'Total Users',    value: users.total,        sub: `${byRole.donor||0} donors · ${byRole.seeker||0} seekers` },
          { label: 'Blood Requests', value: requests.total,     sub: `${byStatus.pending_review||0} pending review` },
          { label: 'Organisations',  value: organisations.total,sub: `${(organisations.byStatus||[]).find(s=>s._id==='approved')?.count||0} approved` },
          { label: 'Total Units',    value: inventory.totalUnits, sub: 'across all hospitals' },
        ].map(({ label, value, sub }) => (
          <div className="admin-stat-card" key={label}>
            <div className="admin-stat-label">{label}</div>
            <div className="admin-stat-value">{value ?? '—'}</div>
            <div className="admin-stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Low stock */}
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--red-400)' }}>
            <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} />
            Low Stock Alerts
          </h3>
          {inventory.lowStockItems?.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>All stock levels are adequate.</p>
            : <div className="low-stock-list">
                {inventory.lowStockItems?.slice(0, 6).map((item, i) => (
                  <div className="low-stock-row" key={i}>
                    <span className="blood-group-pill" style={{ fontSize: '0.75rem' }}>{item.bloodGroup}</span>
                    <span style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{item.hospitalName}</span>
                    <span style={{ color: item.units === 0 ? 'var(--red-400)' : 'var(--color-warning)', fontWeight: 700 }}>{item.units} units</span>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Recent requests */}
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
            <TrendingUp size={16} style={{ display: 'inline', marginRight: 6 }} />
            Recent Requests
          </h3>
          <div className="activity-feed">
            {recentRequests?.map(r => (
              <div className="activity-item" key={r._id}>
                <span className={`activity-dot ${r.urgency}`} />
                <div>
                  <span style={{ fontWeight: 600 }}>{r.patientBloodGroup}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>— {r.hospitalName}</span>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    <span className={`badge badge-${r.status === 'pending_review' ? 'amber' : r.status === 'approved' ? 'green' : 'gray'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      {r.status.replace('_', ' ')}
                    </span>
                    &nbsp;· {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══ HOSPITALS TAB ═══════════════════════════════════════════════════════ */
function HospitalsTab({ admin }) {
  const { fetchHospitals, hospitals, approveHospital, rejectHospital, revokeApiKey, loading } = admin;
  const [filter,    setFilter]    = useState('pending');
  const [modal,     setModal]     = useState(null); // { type, org }
  const [apiKeyInfo, setApiKeyInfo] = useState(null);
  const [acting,    setActing]    = useState(false);

  useEffect(() => { fetchHospitals(filter); }, [fetchHospitals, filter]);

  async function handleApprove(note) {
    setActing(true);
    try {
      const res = await approveHospital(modal.org._id, note);
      setModal(null);
      setApiKeyInfo({ key: res.data.apiKey, name: modal.org.name });
      fetchHospitals(filter);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    } finally { setActing(false); }
  }

  async function handleReject(note) {
    setActing(true);
    try {
      await rejectHospital(modal.org._id, note);
      setModal(null);
      fetchHospitals(filter);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    } finally { setActing(false); }
  }

  async function handleRevoke(org) {
    if (!window.confirm(`Revoke API key for ${org.name}?`)) return;
    try {
      await revokeApiKey(org._id);
      fetchHospitals(filter);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke key.');
    }
  }

  const STATUS_FILTERS = ['pending', 'approved', 'rejected', ''];

  return (
    <>
      <div className="admin-table-wrap">
        <div className="admin-table-toolbar">
          <h3>Organisations ({hospitals.total})</h3>
          <div className="admin-filter-group">
            {STATUS_FILTERS.map(s => (
              <button key={s||'all'} className={`admin-filter-chip${filter===s?' active':''}`} onClick={() => setFilter(s)}>
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading
          ? <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}><Loader2 size={22} className="spin" /></div>
          : <table className="admin-table">
              <thead><tr><th>Name</th><th>Type</th><th>City</th><th>Owner</th><th>Document</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {hospitals.orgs.length === 0
                  ? <tr><td colSpan={7} className="admin-empty">No organisations found.</td></tr>
                  : hospitals.orgs.map(org => (
                      <tr key={org._id}>
                        <td style={{ fontWeight: 600 }}>{org.name}</td>
                        <td><span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{org.type}</span></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{org.address?.city || '—'}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {org.owner?.name}<br /><span style={{ color: 'var(--text-muted)' }}>{org.owner?.email}</span>
                        </td>
                        <td>
                          {org.verificationDocumentUrls && org.verificationDocumentUrls.length > 0
                            ? <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {org.verificationDocumentUrls.map((url, i) => (
                                  <a key={i} className="doc-link" href={url} target="_blank" rel="noreferrer">
                                    <ExternalLink size={13} /> View Doc {org.verificationDocumentUrls.length > 1 ? i+1 : ''}
                                  </a>
                                ))}
                              </div>
                            : (org.verificationDocumentUrl 
                                ? <a className="doc-link" href={org.verificationDocumentUrl} target="_blank" rel="noreferrer">
                                    <ExternalLink size={13} /> View Doc
                                  </a>
                                : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>)
                          }
                        </td>
                        <td>
                          <span className={`badge badge-${org.status==='approved'?'green':org.status==='rejected'?'red':'amber'}`}>
                            {org.status}
                          </span>
                        </td>
                        <td>
                          <div className="admin-actions">
                            {org.status === 'pending' && <>
                              <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px' }} onClick={() => setModal({ type: 'approve', org })}>
                                <CheckCircle size={13} /> Approve
                              </button>
                              <button className="btn btn-danger btn-sm" style={{ padding: '4px 10px' }} onClick={() => setModal({ type: 'reject', org })}>
                                <XCircle size={13} /> Reject
                              </button>
                            </>}
                            {org.status === 'approved' && (
                              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', color: 'var(--red-400)' }} onClick={() => handleRevoke(org)}>
                                <Key size={13} /> Revoke Key
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
        }
      </div>

      {modal?.type === 'approve' && (
        <NoteModal
          title={`Approve "${modal.org.name}"`}
          description="This will activate the account and issue an API key. The key is shown once."
          onConfirm={handleApprove} onClose={() => setModal(null)} loading={acting}
        />
      )}
      {modal?.type === 'reject' && (
        <NoteModal
          title={`Reject "${modal.org.name}"`}
          description="The applicant will see your reason. This action can be reversed by approving later."
          onConfirm={handleReject} onClose={() => setModal(null)} loading={acting} isReject
        />
      )}
      {apiKeyInfo && (
        <ApiKeyModal apiKey={apiKeyInfo.key} orgName={apiKeyInfo.name} onClose={() => setApiKeyInfo(null)} />
      )}
    </>
  );
}

/* ══ REQUESTS TAB ════════════════════════════════════════════════════════ */
function RequestsTab({ admin }) {
  const { fetchRequests, requests, approveRequest, rejectRequest, fulfillRequest, loading } = admin;
  const [filter, setFilter] = useState('pending_review');
  const [modal,  setModal]  = useState(null);
  const [acting, setActing] = useState(false);

  useEffect(() => { fetchRequests(filter); }, [fetchRequests, filter]);

  async function handleAction(note) {
    setActing(true);
    try {
      if (modal.type === 'approve') await approveRequest(modal.req._id, note);
      if (modal.type === 'reject')  await rejectRequest(modal.req._id, note);
      if (modal.type === 'fulfill') await fulfillRequest(modal.req._id);
      setModal(null);
      fetchRequests(filter);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    } finally { setActing(false); }
  }

  const STATUS_FILTERS = ['pending_review', 'approved', 'rejected', 'fulfilled', ''];
  const URGENCY_COLOR  = { critical: 'badge-red', urgent: 'badge-amber', routine: 'badge-green' };

  return (
    <>
      <div className="admin-table-wrap">
        <div className="admin-table-toolbar">
          <h3>Blood Requests ({requests.total})</h3>
          <div className="admin-filter-group">
            {STATUS_FILTERS.map(s => (
              <button key={s||'all'} className={`admin-filter-chip${filter===s?' active':''}`} onClick={() => setFilter(s)}>
                {s ? s.replace('_',' ') : 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading
          ? <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}><Loader2 size={22} className="spin" /></div>
          : <table className="admin-table">
              <thead><tr><th>Patient</th><th>Hospital</th><th>Units</th><th>Urgency</th><th>Document</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {requests.requests.length === 0
                  ? <tr><td colSpan={7} className="admin-empty">No requests found.</td></tr>
                  : requests.requests.map(r => (
                      <tr key={r._id}>
                        <td>
                          <strong>{r.patientBloodGroup}</strong>
                          {r.patientName && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.patientName}</div>}
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.seeker?.name} · {r.seeker?.city}</div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {r.hospitalName}<br /><span style={{ color: 'var(--text-muted)' }}>{r.hospitalCity}</span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{r.unitsNeeded}</td>
                        <td><span className={`badge ${URGENCY_COLOR[r.urgency]}`}>{r.urgency}</span></td>
                        <td>
                          {r.documentUrls && r.documentUrls.length > 0
                            ? <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {r.documentUrls.map((url, i) => (
                                  <a key={i} className="doc-link" href={url} target="_blank" rel="noreferrer">
                                    <ExternalLink size={13} /> View Slip {r.documentUrls.length > 1 ? i+1 : ''}
                                  </a>
                                ))}
                              </div>
                            : (r.documentUrl 
                                ? <a className="doc-link" href={r.documentUrl} target="_blank" rel="noreferrer">
                                    <ExternalLink size={13} /> View Slip
                                  </a> 
                                : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>)
                          }
                        </td>
                        <td>
                          <span className={`badge badge-${r.status==='approved'?'green':r.status==='rejected'?'red':r.status==='fulfilled'?'blue':'amber'}`}>
                            {r.status.replace('_',' ')}
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
        : <table className="admin-table">
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
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="brand-icon"><ShieldCheck size={18} /></div>
          <div>
            <div className="brand-name">BloodLink Admin</div>
            <div className="brand-role">Control Panel</div>
          </div>
        </div>

        <nav className="admin-nav">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`admin-nav-item${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
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
