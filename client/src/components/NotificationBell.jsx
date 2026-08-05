/**
 * NotificationBell — reusable bell icon with badge + slide-down panel.
 *
 * Used in all four role dashboards (Donor, Seeker, Hospital, Admin).
 * Import useNotifications() in the parent and pass the returned object as props.
 *
 * Usage:
 *   const notifs = useNotifications();
 *   <NotificationBell {...notifs} />
 */

import { useRef, useEffect } from 'react';
import { Bell, X, CheckCheck, Loader2 } from 'lucide-react';
import './NotificationBell.css';

const TYPE_ICON = {
  request_approved:  '✅',
  request_rejected:  '❌',
  request_fulfilled: '🎉',
  code_red:          '🚨',
  donor_needed:      '🩸',
  system:            'ℹ️',
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell({
  unreadCount, notifications, loading,
  panelOpen, togglePanel,
  markRead, markAllRead, dismiss,
}) {
  const panelRef = useRef(null);

  // Close panel on outside click.
  useEffect(() => {
    if (!panelOpen) return;
    function handle(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        togglePanel();
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [panelOpen, togglePanel]);

  return (
    <div className="notif-bell-wrap" ref={panelRef}>
      {/* Bell button */}
      <button
        className={`notif-bell-btn${unreadCount > 0 ? ' has-unread' : ''}`}
        onClick={togglePanel}
        aria-label={`Notifications${unreadCount ? ` — ${unreadCount} unread` : ''}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Panel */}
      {panelOpen && (
        <div className="notif-panel">
          {/* Header */}
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifications</span>
            <div className="notif-panel-actions">
              {unreadCount > 0 && (
                <button className="notif-action-btn" onClick={markAllRead} title="Mark all as read">
                  <CheckCheck size={15} />
                </button>
              )}
              <button className="notif-action-btn" onClick={togglePanel} title="Close">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="notif-panel-body">
            {loading ? (
              <div className="notif-loading">
                <Loader2 size={20} className="spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={28} style={{ opacity: 0.3 }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  className={`notif-item${n.isRead ? '' : ' unread'}`}
                  onClick={() => {
                    if (!n.isRead) markRead(n._id);
                    if (n.link) window.location.href = n.link;
                  }}
                >
                  <span className="notif-type-icon">{TYPE_ICON[n.type] || 'ℹ️'}</span>
                  <div className="notif-content">
                    <p className="notif-title">{n.title}</p>
                    <p className="notif-msg">{n.message}</p>
                    <span className="notif-time">{timeAgo(n.createdAt)}</span>
                  </div>
                  <button
                    className="notif-dismiss-btn"
                    onClick={e => { e.stopPropagation(); dismiss(n._id); }}
                    title="Dismiss"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
