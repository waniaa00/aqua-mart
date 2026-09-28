import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DateRangePicker from '../components/DateRangePicker.jsx';
import RevenueChart from '../components/RevenueChart.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { fetchAnalytics } from '../api/analytics.js';
import { fetchDashboardSummary } from '../api/admin.js';

const RANGE_TO_PARAM = { today: 'today', '7d': '7d', '30d': '30d', '90d': '90d', '12m': '12mo' };

const STATUS_BADGE = {
  completed: 'badge-success',
  confirmed: 'badge-success',
  cancelled: 'badge-coral',
};

function usd(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
}

function pct(value) {
  const n = Number(value);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

// Admin-only, always-USD analytics — the currency selector deliberately
// doesn't affect this page (admin reporting is USD-only across this
// backend today, per contracts/analytics.md).
export default function AdminAnalytics() {
  const { token } = useAdminAuth();
  const navigate = useNavigate();

  const [range, setRange] = useState({ preset: '30d', start: null, end: null });
  const [metric, setMetric] = useState('revenue');
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  const [statusBreakdown, setStatusBreakdown] = useState(null);

  const load = useCallback(() => {
    if (!token) return;
    setStatus('loading');
    const params =
      range.preset === 'custom'
        ? { range: 'custom', start: range.start, end: range.end }
        : { range: RANGE_TO_PARAM[range.preset] };
    fetchAnalytics(token, params)
      .then((res) => {
        setData(res);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [token, range]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token) return;
    fetchDashboardSummary(token)
      .then((res) => setStatusBreakdown(res.orders_by_status))
      .catch(() => {});
  }, [token]);

  const maxStatusCount = statusBreakdown ? Math.max(...Object.values(statusBreakdown), 1) : 1;

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Analytics</h1>
        </div>
      </div>

      <DateRangePicker value={range} onChange={setRange} maxCustomDays={366} />

      {status === 'loading' && <p className="muted" style={{ marginTop: '1.5rem' }}>Loading analytics…</p>}
      {status === 'error' && <p className="muted" style={{ marginTop: '1.5rem' }}>Couldn't load analytics right now.</p>}

      {status === 'ready' && data && (
        <>
          <div className="card card-pad" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>Revenue</h3>
              <div className="filter-row">
                <button className={`filter-chip ${metric === 'revenue' ? 'active' : ''}`} onClick={() => setMetric('revenue')}>
                  Revenue
                </button>
                <button className={`filter-chip ${metric === 'order_count' ? 'active' : ''}`} onClick={() => setMetric('order_count')}>
                  Order Count
                </button>
              </div>
            </div>

            <RevenueChart series={data.series} metric={metric} formatValue={metric === 'revenue' ? usd : (v) => `${v} orders`} />

            <div className="grid grid-3" style={{ marginTop: '1rem' }}>
              <div>
                <span className="muted">Total Revenue</span>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.25rem 0 0' }}>{usd(data.totals.revenue)}</p>
              </div>
              <div>
                <span className="muted">Total Orders</span>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.25rem 0 0' }}>{data.totals.order_count}</p>
              </div>
              <div>
                <span className="muted">Avg. Order Value</span>
                <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.25rem 0 0' }}>{usd(data.totals.average_order_value)}</p>
              </div>
            </div>

            {data.comparison && (
              <div className="card card-pad" style={{ marginTop: '1rem', background: 'var(--bg-raised)' }}>
                <p className="muted" style={{ margin: '0 0 0.5rem' }}>vs. previous period</p>
                <div className="grid grid-3">
                  <div>
                    <span className="muted">Revenue</span>
                    <p style={{ margin: '0.2rem 0 0' }}>
                      {usd(data.comparison.previous_totals.revenue)} → {pct(data.comparison.percentage_diff.revenue)}
                    </p>
                  </div>
                  <div>
                    <span className="muted">Orders</span>
                    <p style={{ margin: '0.2rem 0 0' }}>
                      {data.comparison.previous_totals.order_count} → {pct(data.comparison.percentage_diff.order_count)}
                    </p>
                  </div>
                  <div>
                    <span className="muted">Avg. Order Value</span>
                    <p style={{ margin: '0.2rem 0 0' }}>
                      {usd(data.comparison.previous_totals.average_order_value)} → {pct(data.comparison.percentage_diff.average_order_value)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {statusBreakdown && (
            <div className="card card-pad" style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginTop: 0 }}>Orders by Status</h3>
              <div className="status-bar-chart">
                {Object.entries(statusBreakdown).map(([statusKey, count]) => (
                  <button
                    key={statusKey}
                    type="button"
                    className="status-bar-row"
                    onClick={() => navigate(`/admin/orders?status=${statusKey}`)}
                  >
                    <span className="status-bar-label">{statusKey}</span>
                    <span className="status-bar-track">
                      <span
                        className={`status-bar-fill ${STATUS_BADGE[statusKey] ? 'success' : ''} ${statusKey === 'cancelled' ? 'coral' : ''}`}
                        style={{ width: `${(count / maxStatusCount) * 100}%` }}
                      />
                    </span>
                    <span className="status-bar-count">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
