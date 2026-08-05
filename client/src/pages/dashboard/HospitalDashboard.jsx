/**
 * HospitalDashboard — Phase 4
 *
 * Tabs:
 *   Overview   — org status, stock stats, low-stock alerts
 *   Inventory  — add/edit/delete blood group entries, Code Red broadcast
 *   Profile    — update org contact details
 */

import { useState } from 'react';
import {
  Building2, DropletIcon, AlertTriangle, Settings,
  LogOut, Plus, Pencil, Trash2, Siren, X, Loader2,
  CheckCircle, Clock, MapPin, Phone, Mail,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useHospitalData from '../../hooks/useHospitalData';
import useNotifications from '../../hooks/useNotifications';
import NotificationBell from '../../components/NotificationBell';
import PhoneInput from '../../components/PhoneInput';
import '../../styles/hospital.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/* ── helpers ─────────────────────────────────────────────────────────────── */

function unitLevel(units, threshold) {
  if (units === 0)              return 'critical';
  if (units <= threshold)       return 'low';
  return 'good';
}

function formatExpiry(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isCodeRedLive(inv) {
  if (!inv.codeRed?.active) return false;
  if (!inv.codeRed.expiresAt) return false;
  return new Date() < new Date(inv.codeRed.expiresAt);
}

/* ── sub-components ──────────────────────────────────────────────────────── */

function PendingBanner() {
  return (
    <div className="pending-banner">
      <Clock size={20} />
      <div>
        <h4>Awaiting Admin Approval</h4>
        <p>
          Your organisation has been registered and is under review. You can
          update your profile while waiting, but inventory management will
          unlock once an admin approves your account.
        </p>
      </div>
    </div>
  );
}

function CodeRedModal({ inv, onConfirm, onClose, loading }) {
  const [msg, setMsg] = useState('');
  return (
    <div className="code-red-overlay" onClick={onClose}>
      <div className="code-red-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon"><Siren size={24} /></div>
        <h3>Issue Code Red — {inv.bloodGroup}</h3>
        <p>
          This broadcasts an urgent alert visible on the platform for 6 hours.
          Confirm only when stock is critically low and immediate donations are needed.
        </p>
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="input-label">Custom message (optional)</label>
          <input
            className="input"
            placeholder={`Urgent: ${inv.bloodGroup} blood needed`}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onConfirm(inv._id, msg)}
            disabled={loading}
          >
            {loading ? <Loader2 size={15} className="spin" /> : 'Broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── tabs ────────────────────────────────────────────────────────────────── */

function OverviewTab({ profile }) {
  const { org, inventory = [] } = profile;
  const totalUnits = inventory.reduce((s, i) => s + i.units, 0);
  const lowCount   = inventory.filter(i => i.units <= i.lowStockThreshold).length;
  const codeReds   = inventory.filter(isCodeRedLive).length;

  return (
    <>
      {org.status === 'pending' && <PendingBanner />}

      <div className="hospital-stats">
        <div className="hospital-stat-card">
          <div className="stat-label">Total Units</div>
          <div className="stat-value">{totalUnits}</div>
          <div className="stat-sub">bags in stock</div>
        </div>
        <div className="hospital-stat-card">
          <div className="stat-label">Blood Types</div>
          <div className="stat-value">{inventory.length}</div>
          <div className="stat-sub">tracked</div>
        </div>
        <div className="hospital-stat-card">
          <div className="stat-label">Low Stock</div>
          <div className="stat-value" style={{ color: lowCount ? 'var(--color-warning)' : 'inherit' }}>
            {lowCount}
          </div>
          <div className="stat-sub">need attention</div>
        </div>
        <div className="hospital-stat-card">
          <div className="stat-label">Code Reds</div>
          <div className="stat-value" style={{ color: codeReds ? 'var(--red-400)' : 'inherit' }}>
            {codeReds}
          </div>
          <div className="stat-sub">active alerts</div>
        </div>
      </div>

      {lowCount > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--color-warning)' }}>
            ⚠️ Low Stock Alerts
          </h3>
          {inventory
            .filter(i => i.units <= i.lowStockThreshold)
            .map(i => (
              <div key={i._id} className="pending-banner" style={{ marginBottom: 'var(--space-3)', background: 'rgba(245,158,11,0.07)' }}>
                <AlertTriangle size={18} />
                <div>
                  <h4 style={{ color: 'var(--color-warning)' }}>{i.bloodGroup} — {i.units} units remaining</h4>
                  <p>Below threshold of {i.lowStockThreshold}. Consider issuing a Code Red from the Inventory tab.</p>
                </div>
              </div>
            ))
          }
        </div>
      )}

      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Blood Group</th>
              <th>Units</th>
              <th>Expiry</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)' }}>
                No inventory entries yet. Go to the Inventory tab to add stock.
              </td></tr>
            ) : inventory.map(inv => {
              const level = unitLevel(inv.units, inv.lowStockThreshold);
              const pct   = Math.min(100, Math.round((inv.units / Math.max(inv.units, inv.lowStockThreshold * 4, 1)) * 100));
              return (
                <tr key={inv._id}>
                  <td><span className="blood-group-pill">{inv.bloodGroup}</span></td>
                  <td>
                    <div className="units-bar-wrap">
                      <div className="units-bar">
                        <div className={`units-bar-fill ${level}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="units-count">{inv.units}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{formatExpiry(inv.expiresAt)}</td>
                  <td>
                    {isCodeRedLive(inv)
                      ? <span className="code-red-badge"><span className="pulse-dot" />Code Red</span>
                      : <span className={`badge badge-${level === 'good' ? 'green' : level === 'low' ? 'amber' : 'red'}`}>
                          {level === 'good' ? 'Adequate' : level === 'low' ? 'Low' : 'Critical'}
                        </span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function InventoryTab({ profile, hooks }) {
  const { org, inventory = [] } = profile;
  const { saveInventory, updateInventory, removeInventory, issueCodeRed, cancelCodeRed } = hooks;

  const [form, setForm]           = useState({ bloodGroup: '', units: '', expiresAt: '', lowStockThreshold: 2 });
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [codeRedTarget, setCodeRedTarget] = useState(null);
  const [broadcasting, setBroadcasting]   = useState(false);
  const [toast, setToast]         = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function resetForm() { setForm({ bloodGroup: '', units: '', expiresAt: '', lowStockThreshold: 2 }); setEditId(null); }

  function startEdit(inv) {
    setEditId(inv._id);
    setForm({
      bloodGroup:        inv.bloodGroup,
      units:             inv.units,
      expiresAt:         inv.expiresAt ? inv.expiresAt.slice(0, 10) : '',
      lowStockThreshold: inv.lowStockThreshold,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSave() {
    if (!form.bloodGroup || form.units === '') return;
    setSaving(true);
    try {
      const payload = {
        bloodGroup:        form.bloodGroup,
        units:             Number(form.units),
        expiresAt:         form.expiresAt || undefined,
        lowStockThreshold: Number(form.lowStockThreshold),
      };
      if (editId) {
        await updateInventory(editId, payload);
        showToast('Inventory updated successfully.');
      } else {
        await saveInventory(payload);
        showToast('Stock entry added.');
      }
      resetForm();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save inventory.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this blood group entry?')) return;
    try {
      await removeInventory(id);
      showToast('Entry removed.');
    } catch {
      showToast('Failed to remove entry.');
    }
  }

  async function handleBroadcast(invId, message) {
    setBroadcasting(true);
    try {
      await issueCodeRed(invId, message);
      showToast('Code Red broadcast issued!');
      setCodeRedTarget(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to issue broadcast.');
    } finally {
      setBroadcasting(false);
    }
  }

  async function handleCancelRed(invId) {
    try {
      await cancelCodeRed(invId);
      showToast('Code Red cancelled.');
    } catch {
      showToast('Failed to cancel broadcast.');
    }
  }

  const isApproved = org.status === 'approved';

  return (
    <>
      {!isApproved && <PendingBanner />}

      {toast && (
        <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-5)', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 'var(--radius-md)', color: 'var(--color-success)', fontSize: '0.875rem' }}>
          {toast}
        </div>
      )}

      {isApproved && (
        <div className="inventory-form-card">
          <h3>{editId ? 'Edit Entry' : 'Add Blood Group Stock'}</h3>
          <div className="inventory-form-grid">
            <div className="input-group">
              <label className="input-label">Blood Group <span className="required">*</span></label>
              <select
                className="input"
                value={form.bloodGroup}
                onChange={e => setForm(p => ({ ...p, bloodGroup: e.target.value }))}
                disabled={!!editId}
              >
                <option value="">Select…</option>
                {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Units <span className="required">*</span></label>
              <input
                type="number" min={0} className="input"
                value={form.units}
                onChange={e => setForm(p => ({ ...p, units: e.target.value }))}
                placeholder="e.g. 10"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Expiry Date</label>
              <input
                type="date" className="input"
                value={form.expiresAt}
                onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Low Stock Threshold</label>
              <input
                type="number" min={0} className="input"
                value={form.lowStockThreshold}
                onChange={e => setForm(p => ({ ...p, lowStockThreshold: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleSave} disabled={saving || !form.bloodGroup || form.units === ''}>
              {saving ? <Loader2 size={15} className="spin" /> : <><Plus size={15} />{editId ? 'Update' : 'Add'}</>}
            </button>
            {editId && <button className="btn btn-ghost btn-sm" onClick={resetForm}>Cancel</button>}
          </div>
        </div>
      )}

      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Blood Group</th><th>Units</th><th>Threshold</th><th>Expiry</th><th>Alert</th>
              {isApproved && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr><td colSpan={isApproved ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)' }}>
                No inventory entries yet.
              </td></tr>
            ) : inventory.map(inv => {
              const live = isCodeRedLive(inv);
              const level = unitLevel(inv.units, inv.lowStockThreshold);
              return (
                <tr key={inv._id}>
                  <td><span className="blood-group-pill">{inv.bloodGroup}</span></td>
                  <td><strong>{inv.units}</strong></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{inv.lowStockThreshold}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{formatExpiry(inv.expiresAt)}</td>
                  <td>
                    {live
                      ? <span className="code-red-badge"><span className="pulse-dot" />Active</span>
                      : <span className={`badge badge-${level === 'good' ? 'green' : level === 'low' ? 'amber' : 'red'}`}>
                          {level === 'good' ? 'OK' : level === 'low' ? 'Low' : 'Critical'}
                        </span>
                    }
                  </td>
                  {isApproved && (
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                        <button title="Edit" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => startEdit(inv)}>
                          <Pencil size={14} />
                        </button>
                        {live
                          ? <button title="Cancel Code Red" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--red-400)' }} onClick={() => handleCancelRed(inv._id)}>
                              <X size={14} />
                            </button>
                          : <button title="Issue Code Red" className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => setCodeRedTarget(inv)}>
                              <Siren size={14} />
                            </button>
                        }
                        <button title="Delete" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--red-400)' }} onClick={() => handleDelete(inv._id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {codeRedTarget && (
        <CodeRedModal
          inv={codeRedTarget}
          loading={broadcasting}
          onConfirm={handleBroadcast}
          onClose={() => setCodeRedTarget(null)}
        />
      )}
    </>
  );
}

function ProfileTab({ profile, hooks }) {
  const { org } = profile;
  const { saveProfile } = hooks;

  const [form, setForm] = useState({
    name:     org.name     || '',
    city:     org.address?.city     || '',
    street:   org.address?.street   || '',
    province: org.address?.province || '',
    phone:    org.phone    || '',
    email:    org.email    || '',
  });
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function handleSave() {
    setSaving(true);
    try {
      await saveProfile(form, true);
      showToast('Profile updated successfully.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hospital-profile-card">
      <h3>Organisation Profile</h3>
      {toast && (
        <div style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-3) var(--space-4)', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 'var(--radius-md)', color: 'var(--color-success)', fontSize: '0.875rem' }}>
          {toast}
        </div>
      )}
      <div className="profile-form-grid">
        {[
          { label: 'Organisation Name', key: 'name', icon: Building2 },
          { label: 'City',              key: 'city', icon: MapPin },
          { label: 'Street / Area',     key: 'street', icon: MapPin },
          { label: 'Province',          key: 'province', icon: MapPin },
          { label: 'Phone',             key: 'phone', icon: Phone },
          { label: 'Contact Email',     key: 'email', icon: Mail },
        ].map(({ label, key, icon: Icon }) => (
          <div className="input-group" key={key}>
            <label className="input-label">{label}</label>
            {key === 'phone' ? (
              <div className="input-wrapper" style={{ display: 'block' }}>
                <PhoneInput 
                  value={form[key]} 
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} 
                  name={key} 
                />
              </div>
            ) : (
              <div className="input-wrapper">
                <Icon className="input-icon" size={17} />
                <input
                  className="input has-icon"
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={label}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
        <button className="btn btn-secondary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="spin" /> : 'Save Changes'}
        </button>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Status: <strong style={{ color: org.status === 'approved' ? 'var(--color-success)' : 'var(--color-warning)' }}>{org.status}</strong>
        </span>
      </div>
    </div>
  );
}

/* ── Registration form (shown before org exists) ─────────────────────────── */

function RegisterOrgForm({ onSave }) {
  const [form, setForm]     = useState({ type: 'hospital', name: '', city: '', street: '', province: '', phone: '', email: '' });
  const [files, setFiles]   = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.city) return setError('Name and city are required.');
    
    // Phone validation: allow optional + at start, and 10 to 14 digits (Pakistani format is typically 11 digits starting with 0, or +92 followed by 10 digits)
    if (form.phone && !/^\+?\d{10,14}$/.test(form.phone.replace(/[\s-]/g, ''))) {
      return setError('Please enter a valid phone number (e.g. 03001234567 or +923001234567).');
    }
    
    if (!files || files.length === 0) return setError('Verification document is required.');

    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach(f => fd.append('verificationDocuments', f));

      await onSave(fd, false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      const details = err.response?.data?.errors?.map(e => e.message).join(' | ');
      setError(details ? `${msg} (${details})` : msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="hospital-section-header">
        <h2>Register Your Organisation</h2>
        <p>Fill in your details below. An admin will review and approve your account before you can manage inventory.</p>
      </div>
      <div className="hospital-profile-card">
        <h3>Organisation Details</h3>
        {error && <div style={{ marginBottom: 'var(--space-4)', color: 'var(--red-400)', fontSize: '0.875rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="profile-form-grid">
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Organisation Type</label>
              <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <option value="hospital">Hospital / Blood Bank</option>
                <option value="partner">Partner Organisation (PRCS, University Society, etc.)</option>
              </select>
            </div>
            {[
              { label: 'Organisation Name *', key: 'name', span: true },
              { label: 'City *',              key: 'city' },
              { label: 'Street / Area',       key: 'street' },
              { label: 'Province',            key: 'province' },
              { label: 'Phone',               key: 'phone' },
              { label: 'Contact Email',       key: 'email' },
            ].map(({ label, key, span }) => (
              <div className="input-group" key={key} style={span ? { gridColumn: '1 / -1' } : {}}>
                <label className="input-label">{label}</label>
                {key === 'phone' ? (
                  <PhoneInput 
                    value={form[key]} 
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} 
                    name={key} 
                  />
                ) : (
                  <input className="input" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={label.replace(' *', '')} />
                )}
              </div>
            ))}
            
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Registration / Verification Documents (Max 3) *</label>
              
              <input 
                type="file" 
                className="input" 
                accept="image/*,.pdf"
                multiple
                onChange={e => {
                  const selected = Array.from(e.target.files);
                  if (selected.length > 3) {
                    setError('You can only upload a maximum of 3 documents.');
                    return;
                  }
                  setError('');
                  setFiles(selected);
                }}
                style={{ padding: '0.5rem' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Upload PMC certificate, Health Board License, or official registration proof.
              </p>
              
              {files.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      • {f.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button type="submit" className="btn btn-secondary mt-4" disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : 'Submit for Review'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── main dashboard ──────────────────────────────────────────────────────── */

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: DropletIcon },
  { id: 'inventory',  label: 'Inventory',  icon: Plus },
  { id: 'profile',    label: 'Profile',    icon: Settings },
];

export default function HospitalDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]   = useState('overview');

  const hookData = useHospitalData();
  const { profile, loading, error } = hookData;
  const notifs = useNotifications();

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--blue-400)' }} />
      </div>
    );
  }

  // No org registered yet
  if (!profile) {
    return (
      <div className="hospital-layout">
        <aside className="hospital-sidebar">
          <div className="hospital-sidebar-brand">
            <div className="brand-icon"><Building2 size={20} /></div>
            <div>
              <div className="brand-name">BloodSync</div>
              <div className="brand-role">Hospital Portal</div>
            </div>
          </div>
          <div className="hospital-sidebar-footer">
            <div style={{ padding: 'var(--space-2) var(--space-4)', marginBottom: 'var(--space-2)' }}>
              <NotificationBell {...notifs} />
            </div>
            <button className="hospital-nav-item" onClick={logout} style={{ color: 'var(--red-400)' }}>
              <LogOut size={18} /> Sign out
            </button>
          </div>
        </aside>
        <main className="hospital-main animate-fade-up">
          <RegisterOrgForm onSave={hookData.saveProfile} />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', color: 'var(--red-400)' }}>
        {error}
      </div>
    );
  }

  return (
    <div className="hospital-layout">
      {/* Sidebar */}
      <aside className="hospital-sidebar">
        <div className="hospital-sidebar-brand">
          <div className="brand-icon"><Building2 size={20} /></div>
          <div>
            <div className="brand-name">{profile.org.name}</div>
            <div className="brand-role">{profile.org.type === 'partner' ? 'Partner Org' : 'Hospital'}</div>
          </div>
        </div>

        <nav className="hospital-nav">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`hospital-nav-item${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={18} />{label}
            </button>
          ))}
        </nav>

        <div className="hospital-sidebar-footer">
          <div style={{ padding: 'var(--space-2) var(--space-4)', marginBottom: 'var(--space-2)' }}>
            <NotificationBell {...notifs} />
          </div>
          <div style={{ padding: 'var(--space-3) var(--space-4)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
            {user?.name}
          </div>
          <button className="hospital-nav-item" onClick={logout} style={{ color: 'var(--red-400)' }}>
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="hospital-main animate-fade-up">
        <div className="hospital-section-header">
          <h2>
            {tab === 'overview'  && 'Dashboard Overview'}
            {tab === 'inventory' && 'Blood Inventory'}
            {tab === 'profile'   && 'Organisation Profile'}
          </h2>
        </div>

        {tab === 'overview'  && <OverviewTab  profile={profile} />}
        {tab === 'inventory' && <InventoryTab profile={profile} hooks={hookData} />}
        {tab === 'profile'   && <ProfileTab   profile={profile} hooks={hookData} />}
      </main>
    </div>
  );
}
