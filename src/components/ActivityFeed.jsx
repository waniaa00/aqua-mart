import { useMemo } from 'react';

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// Composed from data Dashboard.jsx already loads (orders, appointments) —
// no separate fetch; avoids a redundant round-trip for data already in
// memory, same reasoning as reusing existing drawers below rather than
// building new navigation.
//
// Reviews and wishlist additions are deliberately NOT in this feed:
// reviews have no per-customer listing endpoint (only per-product — see
// reused-endpoints-map.md), and WishlistProductResponse carries no
// timestamp at all. Fabricating one to force them into a chronological
// feed would violate constitution §31 (No Fake Functionality) — omitted
// rather than invented, same principle already applied to reviews.
// Appointment entries sort by their scheduled date/time (the only
// timestamp AppointmentResponse exposes), not a true "booked at" time —
// AppointmentResponse has no created_at field either.
export default function ActivityFeed({ orders, appointments, orderStatus, appointmentStatus, onSelectOrder, onSelectAppointment }) {
  const entries = useMemo(() => {
    if (orderStatus !== 'ready' || appointmentStatus !== 'ready') return null;
    const orderEntries = orders.map((o) => ({
      key: `order-${o.id}`,
      timestamp: o.placed_at,
      label: `Order placed — ${o.items.map((i) => i.product_name).join(', ')}`,
      status: o.status,
      onClick: () => onSelectOrder(o),
    }));
    const apptEntries = appointments.map((a) => ({
      key: `appt-${a.id}`,
      timestamp: `${a.date}T${a.start_time}`,
      label: `Appointment — ${a.service_name}`,
      status: a.status,
      onClick: () => onSelectAppointment(a),
    }));
    return [...orderEntries, ...apptEntries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);
  }, [orders, appointments, orderStatus, appointmentStatus]);

  if (entries === null) {
    return <p className="muted">Loading activity…</p>;
  }
  if (entries.length === 0) {
    return <p className="muted">No recent activity yet.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      {entries.map((entry) => (
        <button key={entry.key} type="button" className="dashboard-list-row" onClick={entry.onClick}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{entry.label}</span>
            <span className="badge">{entry.status}</span>
          </div>
          <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>
            {formatTimestamp(entry.timestamp)}
          </p>
        </button>
      ))}
    </div>
  );
}
