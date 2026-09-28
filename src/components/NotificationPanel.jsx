import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Drawer from './Drawer.jsx';
import { fetchNotifications, fetchAdminNotifications, markNotificationRead } from '../api/notifications.js';

function describe(n) {
  switch (n.event_type) {
    case 'order_status_changed':
      return `Order status changed to ${n.payload.status}`;
    case 'appointment_confirmed':
      return 'Your appointment was confirmed';
    case 'appointment_cancelled':
      return 'Your appointment was cancelled';
    case 'low_stock_alert':
      return `Low stock alert — ${n.payload.stock_quantity} left`;
    default:
      return n.event_type;
  }
}

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// Customer: full read state (delivered_at == null means unread — see
// research.md §2), mark one/all read, opens the related order/appointment.
// Admin: read-only — the backend has no per-admin mark-read endpoint for
// broadcast (recipient_user_id IS NULL) notifications.
export default function NotificationPanel({ role, token, open, onClose, onChanged }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!open || !token) return;
    setStatus('loading');
    const fetcher = role === 'admin' ? fetchAdminNotifications : fetchNotifications;
    fetcher(token, { limit: 50 })
      .then((res) => {
        setItems(res.items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [open, token, role]);

  async function handleMarkRead(n) {
    if (role === 'admin' || n.delivered_at) return;
    await markNotificationRead(token, n.id);
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, delivered_at: new Date().toISOString() } : i)));
    onChanged?.();
  }

  async function handleMarkAllRead() {
    const unread = items.filter((n) => !n.delivered_at);
    await Promise.all(unread.map((n) => markNotificationRead(token, n.id)));
    setItems((prev) => prev.map((i) => ({ ...i, delivered_at: i.delivered_at ?? new Date().toISOString() })));
    onChanged?.();
  }

  function handleOpenRelated(n) {
    handleMarkRead(n);
    onClose();
    if (n.event_type === 'order_status_changed') {
      navigate('/dashboard');
      setTimeout(() => document.getElementById('recent-orders')?.scrollIntoView({ behavior: 'smooth' }), 200);
    } else if (n.event_type === 'appointment_confirmed' || n.event_type === 'appointment_cancelled') {
      navigate('/dashboard');
      setTimeout(() => document.getElementById('upcoming-appointment')?.scrollIntoView({ behavior: 'smooth' }), 200);
    }
  }

  const unreadCount = items.filter((n) => !n.delivered_at).length;

  return (
    <Drawer open={open} onClose={onClose} title="Notifications">
      {role !== 'admin' && items.length > 0 && unreadCount > 0 && (
        <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead} style={{ marginBottom: '1rem' }}>
          Mark all read
        </button>
      )}
      {status === 'loading' && <p className="muted">Loading…</p>}
      {status === 'error' && <p className="muted">Couldn't load notifications right now.</p>}
      {status === 'ready' &&
        (items.length === 0 ? (
          <p className="muted">No notifications yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {items.map((n) => {
              const unread = !n.delivered_at;
              const clickable = role !== 'admin' && (n.event_type === 'order_status_changed' || n.event_type.startsWith('appointment_'));
              return (
                <div
                  key={n.id}
                  className={`notification-row ${unread ? 'unread' : ''} ${clickable ? 'clickable' : ''}`}
                  onClick={clickable ? () => handleOpenRelated(n) : undefined}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span>{describe(n)}</span>
                    {unread && role !== 'admin' && <span className="notification-dot" aria-label="Unread" />}
                  </div>
                  <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>
                    {formatTime(n.created_at)}
                  </p>
                  {unread && role !== 'admin' && !clickable && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleMarkRead(n)} style={{ marginTop: '0.4rem' }}>
                      Mark read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
    </Drawer>
  );
}
