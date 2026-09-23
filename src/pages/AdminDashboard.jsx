import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { fetchDashboardSummary } from '../api/admin.js';

const STAT_TILES = [
  { key: 'total_sales', label: 'Total Sales', icon: 'cart', money: true },
  { key: 'total_orders', label: 'Total Orders', icon: 'package' },
  { key: 'total_customers', label: 'Total Customers', icon: 'user' },
  { key: 'total_products', label: 'Total Products', icon: 'fish' },
  { key: 'total_appointments', label: 'Total Appointments', icon: 'calendar' },
];

const STATUS_BADGE = {
  completed: 'badge-success',
  confirmed: 'badge-success',
  cancelled: 'badge-coral',
  pending: 'badge',
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminDashboard() {
  const { isAuthenticated, token, logout } = useAdminAuth();
  const location = useLocation();
  const { format } = useCurrency();
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setStatus('loading');
    fetchDashboardSummary(token)
      .then((res) => {
        if (cancelled) return;
        setSummary(res);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 401) {
          logout();
          return;
        }
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <section className="section container">
      <div className="section-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Dashboard</h1>
        </div>
        <button className="btn btn-outline" onClick={logout}>
          Log Out
        </button>
      </div>

      {status === 'loading' && <p className="muted">Loading dashboard…</p>}
      {status === 'error' && <p className="muted">Couldn't load the dashboard right now. Please try again shortly.</p>}

      {status === 'ready' && summary && (
        <>
          <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
            {STAT_TILES.map(({ key, label, icon, money }) => (
              <div key={key} className="card card-pad">
                <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                  <Icon name={icon} size={18} /> {label}
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>
                  {money ? format(summary[key]) : summary[key]}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-2" style={{ marginBottom: '2rem' }}>
            <div className="card card-pad">
              <h3 style={{ marginTop: 0 }}>Orders by Status</h3>
              <StatusPills counts={summary.orders_by_status} />
            </div>
            <div className="card card-pad">
              <h3 style={{ marginTop: 0 }}>Appointments by Status</h3>
              <StatusPills counts={summary.appointments_by_status} />
            </div>
          </div>

          {summary.low_stock_products.length > 0 && (
            <div className="card card-pad" style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginTop: 0 }}>Low Stock</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="spec-table">
                  <tbody>
                    {summary.low_stock_products.map((p) => (
                      <tr key={p.id}>
                        <th>{p.name}</th>
                        <td>
                          {p.stock_quantity} left (threshold {p.low_stock_threshold})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card card-pad" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginTop: 0 }}>Best-Selling Products</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="spec-table">
                <tbody>
                  {summary.best_selling_products.map((p) => (
                    <tr key={p.id}>
                      <th>{p.name}</th>
                      <td>{p.total_quantity_sold} sold</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card card-pad">
              <h3 style={{ marginTop: 0 }}>Recent Orders</h3>
              {summary.recent_orders.length === 0 ? (
                <p className="muted">No orders yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
                  {summary.recent_orders.map((o) => (
                    <li key={o.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={`badge ${STATUS_BADGE[o.status] ?? 'badge'}`}>{o.status}</span>
                        <span className="price">{format(o.total)}</span>
                      </div>
                      <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                        {o.items.map((i) => `${i.quantity}× ${i.product_name}`).join(', ')} · {formatDateTime(o.placed_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card card-pad">
              <h3 style={{ marginTop: 0 }}>Recent Appointments</h3>
              {summary.recent_appointments.length === 0 ? (
                <p className="muted">No appointments yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
                  {summary.recent_appointments.map((a) => (
                    <li key={a.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{a.service_name}</span>
                        <span className={`badge ${STATUS_BADGE[a.status] ?? 'badge'}`}>{a.status}</span>
                      </div>
                      <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                        {a.date} · {a.start_time}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function StatusPills({ counts }) {
  const entries = Object.entries(counts ?? {});
  if (entries.length === 0) return <p className="muted">No data yet.</p>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {entries.map(([status, count]) => (
        <span key={status} className={`badge ${STATUS_BADGE[status] ?? 'badge'}`}>
          {status}: {count}
        </span>
      ))}
    </div>
  );
}
