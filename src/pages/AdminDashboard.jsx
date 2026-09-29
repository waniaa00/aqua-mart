import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { fetchDashboardSummary } from '../api/admin.js';

// Each tile navigates to its management view (FR-012). `color` picks one of
// the .kpi-* modifier classes in index.css — each carries its own icon-badge
// tint, top accent bar, and hover glow, so every metric reads as a distinct
// color at a glance rather than five identical cyan cards.
const STAT_TILES = [
  { key: 'total_sales', label: 'Total Sales', icon: 'cart', money: true, to: '/admin/analytics', color: 'cyan' },
  { key: 'total_orders', label: 'Total Orders', icon: 'package', to: '/admin/orders', color: 'coral' },
  { key: 'total_customers', label: 'Total Customers', icon: 'user', to: '/admin/customers', color: 'gold' },
  { key: 'total_products', label: 'Total Products', icon: 'fish', to: '/admin/products', color: 'violet' },
  { key: 'total_appointments', label: 'Total Appointments', icon: 'calendar', to: '/admin/appointments', color: 'success' },
];

// Covers every OrderStatus/AppointmentStatus value the backend defines
// (backend/app/db/models/order.py, service.py) so nothing silently falls
// back to a colorless default.
const STATUS_COLOR = {
  pending: 'gold',
  confirmed: 'cyan',
  processing: 'violet',
  ready_for_delivery: 'violet',
  out_for_delivery: 'cyan',
  completed: 'success',
  cancelled: 'coral',
  in_progress: 'violet',
  no_show: 'coral',
};

const STATUS_BADGE = {
  completed: 'badge-success',
  confirmed: 'badge-success',
  processing: 'badge-violet',
  ready_for_delivery: 'badge-violet',
  in_progress: 'badge-violet',
  pending: 'badge-gold',
  cancelled: 'badge-coral',
  no_show: 'badge-coral',
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminDashboard() {
  const { token, logout } = useAdminAuth();
  const navigate = useNavigate();
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

  // A genuine derived metric (total revenue / order count) — not a new
  // backend field, computed from the two the summary already returns.
  const avgOrderValue = useMemo(() => {
    if (!summary || !summary.total_orders) return null;
    return Number(summary.total_sales.display_price) / summary.total_orders;
  }, [summary]);

  const maxBestSeller = useMemo(() => {
    if (!summary?.best_selling_products?.length) return 1;
    return Math.max(...summary.best_selling_products.map((p) => p.total_quantity_sold), 1);
  }, [summary]);

  return (
    <section className="section" style={{ paddingTop: 0 }}>
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
          <div className="dashboard-kpi-grid" style={{ marginBottom: '2rem' }}>
            {STAT_TILES.map(({ key, label, icon, money, to, color }) => (
              <button
                key={key}
                className={`card card-pad dashboard-kpi-tile kpi-${color}`}
                onClick={() => navigate(to)}
                type="button"
              >
                <span className="kpi-icon-badge">
                  <Icon name={icon} size={18} />
                </span>
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  {label}
                </span>
                <div className="kpi-value">{money ? format(summary[key]) : summary[key]}</div>
              </button>
            ))}

            {avgOrderValue !== null && (
              <div className="card card-pad dashboard-kpi-tile kpi-cyan" style={{ cursor: 'default' }}>
                <span className="kpi-icon-badge">
                  <Icon name="trending-up" size={18} />
                </span>
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  Average Order Value
                </span>
                <div className="kpi-value">{format(avgOrderValue)}</div>
              </div>
            )}
          </div>

          <div className="grid grid-2" style={{ marginBottom: '2rem' }}>
            <div className="card card-pad">
              <h3 style={{ marginTop: 0 }}>Orders by Status</h3>
              <StatusBreakdown counts={summary.orders_by_status} linkTo={(s) => `/admin/orders?status=${s}`} />
            </div>
            <div className="card card-pad">
              <h3 style={{ marginTop: 0 }}>Appointments by Status</h3>
              <StatusBreakdown counts={summary.appointments_by_status} />
            </div>
          </div>

          {summary.low_stock_products.length > 0 && (
            <div className="card card-pad" style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon name="sliders" size={18} style={{ color: 'var(--coral)' }} /> Low Stock
              </h3>
              {summary.low_stock_products.map((p) => {
                const pct = Math.min((p.stock_quantity / Math.max(p.low_stock_threshold, 1)) * 100, 100);
                const empty = p.stock_quantity === 0;
                return (
                  <div key={p.id} className={`meter-row ${empty ? 'kpi-coral' : 'kpi-gold'}`}>
                    <div className="meter-row-head">
                      <span>{p.name}</span>
                      <span className="muted">
                        {p.stock_quantity} left (threshold {p.low_stock_threshold})
                      </span>
                    </div>
                    <div className="meter-track">
                      <div className="meter-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="card card-pad" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="trending-up" size={18} style={{ color: 'var(--gold)' }} /> Best-Selling Products
            </h3>
            {summary.best_selling_products.length === 0 ? (
              <p className="muted">No sales yet.</p>
            ) : (
              summary.best_selling_products.map((p, i) => (
                <div key={p.id} className="meter-row kpi-gold">
                  <div className="meter-row-head">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="bestseller-rank">{i + 1}</span> {p.name}
                    </span>
                    <span className="muted">{p.total_quantity_sold} sold</span>
                  </div>
                  <div className="meter-track">
                    <div className="meter-fill" style={{ width: `${(p.total_quantity_sold / maxBestSeller) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
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

// Stacked proportional bar + a legend of clickable pills — shows both the
// exact counts (the pills) and their relative share at a glance (the bar),
// which a flat list of badges couldn't.
function StatusBreakdown({ counts, linkTo }) {
  const navigate = useNavigate();
  const entries = Object.entries(counts ?? {});
  if (entries.length === 0) return <p className="muted">No data yet.</p>;

  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div>
      <div className="status-breakdown-bar">
        {entries.map(([s, count]) => (
          <div
            key={s}
            className={`status-breakdown-segment kpi-${STATUS_COLOR[s] ?? 'cyan'}`}
            style={{ width: `${(count / total) * 100}%`, background: 'var(--kpi-color)' }}
            title={`${s}: ${count}`}
          />
        ))}
      </div>
      <div className="status-breakdown-legend">
        {entries.map(([s, count]) => {
          const colorClass = `kpi-${STATUS_COLOR[s] ?? 'cyan'}`;
          const content = (
            <>
              <span className={`status-dot ${colorClass}`} />
              {s}: {count}
            </>
          );
          return linkTo ? (
            <button key={s} type="button" className={`status-breakdown-item ${colorClass}`} onClick={() => navigate(linkTo(s))}>
              {content}
            </button>
          ) : (
            <span key={s} className={`status-breakdown-item ${colorClass}`}>
              {content}
            </span>
          );
        })}
      </div>
    </div>
  );
}
