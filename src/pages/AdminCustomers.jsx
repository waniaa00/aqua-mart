import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import Drawer from '../components/Drawer.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { listCustomers, getCustomerDetail } from '../api/admin_customers.js';

const ORDER_STATUS_BADGE = {
  completed: 'badge-success',
  confirmed: 'badge-success',
  cancelled: 'badge-coral',
};

const APPT_STATUS_BADGE = {
  completed: 'badge-success',
  confirmed: 'badge-success',
  cancelled: 'badge-coral',
  no_show: 'badge-coral',
};

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminCustomers() {
  const { token } = useAdminAuth();
  const { format } = useCurrency();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);

  const requestKeyRef = useRef(null);

  const load = useCallback(() => {
    if (!token) return;
    const requestKey = `${search}|${page}`;
    requestKeyRef.current = requestKey;
    setLoading(true);
    setError(false);
    listCustomers(token, { search: search || undefined, page, limit: 20 })
      .then((res) => {
        if (requestKeyRef.current !== requestKey) return;
        setRows(res.items);
        setPageCount(res.total_pages);
      })
      .catch(() => {
        if (requestKeyRef.current !== requestKey) return;
        setError(true);
      })
      .finally(() => {
        if (requestKeyRef.current !== requestKey) return;
        setLoading(false);
      });
  }, [token, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(false);
    getCustomerDetail(token, detailId)
      .then(setDetail)
      .catch(() => setDetailError(true))
      .finally(() => setDetailLoading(false));
  }, [token, detailId]);

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Name', render: (c) => c.name },
      { key: 'email', label: 'Email' },
      { key: 'joined_at', label: 'Joined', sortable: false, render: (c) => formatDate(c.joined_at) },
      { key: 'total_orders', label: 'Orders' },
      { key: 'total_appointments', label: 'Appointments' },
      { key: 'total_spent', label: 'Total Spent', render: (c) => format(c.total_spent) },
      { key: 'is_active', label: 'Status', render: (c) => <span className={`badge ${c.is_active ? 'badge-success' : 'badge-coral'}`}>{c.is_active ? 'active' : 'inactive'}</span> },
    ],
    [format]
  );

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Customers</h1>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by name or email…"
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        loading={loading}
        error={error}
        onRetry={load}
        emptyMessage="No customers match this search."
        onRowClick={(c) => setDetailId(c.id)}
      />

      <Drawer open={Boolean(detailId)} onClose={() => setDetailId(null)} title={detail?.name ?? ''}>
        {detailLoading && <p className="muted">Loading customer…</p>}
        {detailError && <p className="muted">Couldn't load this customer right now.</p>}
        {detail && !detailLoading && !detailError && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <p style={{ margin: 0 }}>{detail.email}</p>
              {detail.phone && <p className="muted" style={{ margin: '0.25rem 0 0' }}>{detail.phone}</p>}
              <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                Joined {formatDate(detail.joined_at)} · {detail.preferred_currency} ·{' '}
                <span className={`badge ${detail.is_active ? 'badge-success' : 'badge-coral'}`}>{detail.is_active ? 'active' : 'inactive'}</span>
              </p>
            </div>

            {detail.addresses.length > 0 && (
              <div>
                <h4 style={{ marginBottom: '0.5rem' }}>Addresses</h4>
                {detail.addresses.map((a) => (
                  <p key={a.id} className="muted" style={{ margin: '0 0 0.35rem', fontSize: '0.9rem' }}>
                    {a.address_line}, {a.city}, {a.postal_code}, {a.country}
                  </p>
                ))}
              </div>
            )}

            <div>
              <h4 style={{ marginBottom: '0.5rem' }}>
                Orders ({detail.total_orders}) — {format(detail.total_spent)} total
              </h4>
              {detail.orders.length === 0 && <p className="muted">No orders yet.</p>}
              {detail.orders.map((o) => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                  <span>
                    <span className={`badge ${ORDER_STATUS_BADGE[o.status] ?? 'badge'}`}>{o.status}</span> {formatDate(o.placed_at)}
                  </span>
                  <span>{format(o.total)}</span>
                </div>
              ))}
            </div>

            <div>
              <h4 style={{ marginBottom: '0.5rem' }}>Appointments ({detail.total_appointments})</h4>
              {detail.appointments.length === 0 && <p className="muted">No appointments yet.</p>}
              {detail.appointments.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                  <span>
                    <span className={`badge ${APPT_STATUS_BADGE[a.status] ?? 'badge'}`}>{a.status}</span> {a.service_name}
                  </span>
                  <span className="muted">
                    {a.date} · {a.start_time}
                  </span>
                </div>
              ))}
            </div>

            {/* Reviews are deliberately omitted: CustomerDetailResponse
                (backend/app/schemas/admin.py) has no reviews field and
                there's no per-customer review-listing endpoint — the same
                gap already documented for the activity feed (US16). */}
          </div>
        )}
      </Drawer>
    </section>
  );
}
