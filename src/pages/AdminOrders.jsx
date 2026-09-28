import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import Drawer from '../components/Drawer.jsx';
import Modal from '../components/Modal.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { getOrder, listOrders, updateOrderStatus } from '../api/admin_orders.js';
import { ApiError } from '../api/client.js';

// Mirrors backend ORDER_STATUS_TRANSITIONS (order.py) — shown here only to
// keep the status dropdown from offering an obviously-invalid next status;
// the backend remains the authority and its rejection is still surfaced
// verbatim on failure (FR-020c).
const NEXT_STATUSES = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['ready_for_delivery', 'cancelled'],
  ready_for_delivery: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['completed'],
  completed: [],
  cancelled: [],
};

const ALL_STATUSES = Object.keys(NEXT_STATUSES);

const STATUS_BADGE = {
  completed: 'badge-success',
  confirmed: 'badge-success',
  cancelled: 'badge-coral',
};

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminOrders() {
  const { token } = useAdminAuth();
  const { format } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('placed_at_desc');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailOrder, setDetailOrder] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null); // { orderId, status } | { bulk: true, status }
  const [statusError, setStatusError] = useState('');
  const [applying, setApplying] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(false);
    listOrders(token, { search, status: status || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, sort, page, limit: 20 })
      .then((res) => {
        setRows(res.items);
        setPageCount(res.total_pages);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token, search, status, dateFrom, dateTo, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Consume a ?status= pre-filter from a KPI/status-pill deep link (T034)
  // then drop it from the URL so manually clearing the filter afterward
  // doesn't fight with a stale query param.
  useEffect(() => {
    if (searchParams.get('status')) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(
    () => [
      { key: 'id', label: 'Order', render: (o) => <span title={o.id}>{o.id.slice(0, 8)}</span> },
      { key: 'customer', label: 'Customer', render: (o) => o.customer_name || o.customer_email },
      { key: 'placed_at', label: 'Date', sortable: true, render: (o) => formatDate(o.placed_at) },
      { key: 'status', label: 'Status', render: (o) => <span className={`badge ${STATUS_BADGE[o.status] ?? 'badge'}`}>{o.status}</span> },
      { key: 'total', label: 'Total', sortable: true, render: (o) => format(o.total) },
    ],
    [format]
  );

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  function openDetail(order) {
    setDetailOrder(order);
  }

  async function confirmStatusChange() {
    if (!pendingStatus) return;
    setApplying(true);
    setStatusError('');
    try {
      if (pendingStatus.bulk) {
        const failures = [];
        for (const id of selectedIds) {
          try {
            await updateOrderStatus(token, id, pendingStatus.status);
          } catch (err) {
            failures.push({ id, message: err instanceof ApiError ? err.message : 'Failed' });
          }
        }
        if (failures.length > 0) {
          setStatusError(`${failures.length} order(s) couldn't be updated: ${failures.map((f) => `${f.id.slice(0, 8)} — ${f.message}`).join('; ')}`);
        } else {
          setPendingStatus(null);
          setSelectedIds(new Set());
        }
      } else {
        await updateOrderStatus(token, pendingStatus.orderId, pendingStatus.status);
        setPendingStatus(null);
        if (detailOrder?.id === pendingStatus.orderId) {
          const refreshed = await getOrder(token, pendingStatus.orderId);
          setDetailOrder((prev) => ({ ...prev, ...refreshed }));
        }
      }
      load();
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : "Couldn't update status.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Orders</h1>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(o) => o.id}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by order ID or customer email…"
        filters={
          <>
            <select className="input" value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))} style={{ width: 'auto' }}>
              <option value="">All statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input type="date" className="input" style={{ width: 'auto' }} value={dateFrom} onChange={(e) => (setDateFrom(e.target.value), setPage(1))} aria-label="From date" />
            <input type="date" className="input" style={{ width: 'auto' }} value={dateTo} onChange={(e) => (setDateTo(e.target.value), setPage(1))} aria-label="To date" />
          </>
        }
        sort={sort ? { key: sort.startsWith('placed_at') ? 'placed_at' : 'total', direction: sort.endsWith('asc') ? 'asc' : 'desc' } : null}
        onSortChange={(key) => {
          if (key === 'placed_at') setSort((s) => (s === 'placed_at_desc' ? 'placed_at_asc' : 'placed_at_desc'));
          else setSort((s) => (s === 'total_desc' ? 'total_asc' : 'total_desc'));
        }}
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        loading={loading}
        error={error}
        onRetry={load}
        emptyMessage="No orders match this filter."
        selectable
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onRowClick={openDetail}
      />

      {selectedIds.size > 0 && (
        <div className="card card-pad" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span>{selectedIds.size} selected</span>
          <select
            className="input"
            style={{ width: 'auto' }}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) setPendingStatus({ bulk: true, status: e.target.value });
              e.target.value = '';
            }}
          >
            <option value="" disabled>
              Bulk update status…
            </option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      <Drawer open={Boolean(detailOrder)} onClose={() => setDetailOrder(null)} title={detailOrder ? `Order ${detailOrder.id.slice(0, 8)}` : ''}>
        {detailOrder && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <span className={`badge ${STATUS_BADGE[detailOrder.status] ?? 'badge'}`}>{detailOrder.status}</span>
              <p className="muted" style={{ margin: '0.5rem 0 0' }}>
                {detailOrder.customer_name || detailOrder.customer_email} · {formatDate(detailOrder.placed_at)}
              </p>
              {detailOrder.shipping_address && (
                <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
                  {detailOrder.shipping_address.address_line}, {detailOrder.shipping_address.city}, {detailOrder.shipping_address.postal_code}, {detailOrder.shipping_address.country}
                </p>
              )}
            </div>
            <div>
              <h4 style={{ marginBottom: '0.5rem' }}>Items</h4>
              {detailOrder.items.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                  <span>
                    {item.quantity}× {item.product_name}
                  </span>
                  <span>{format(item.unit_price)}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Subtotal</span>
                <span>{format(detailOrder.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Discount</span>
                <span>{format(detailOrder.discount_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Total</span>
                <span>{format(detailOrder.total)}</span>
              </div>
            </div>
            {NEXT_STATUSES[detailOrder.status]?.length > 0 && (
              <div>
                <label htmlFor="status-change">Update status</label>
                <select
                  id="status-change"
                  className="input"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) setPendingStatus({ orderId: detailOrder.id, status: e.target.value });
                  }}
                >
                  <option value="" disabled>
                    Select next status…
                  </option>
                  {NEXT_STATUSES[detailOrder.status].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={Boolean(pendingStatus)}
        onClose={() => (setPendingStatus(null), setStatusError(''))}
        title="Confirm status change"
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setPendingStatus(null)} disabled={applying}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={confirmStatusChange} disabled={applying}>
              {applying ? 'Applying…' : 'Confirm'}
            </button>
          </>
        }
      >
        {pendingStatus && (
          <p>
            {pendingStatus.bulk
              ? `This will change ${selectedIds.size} order(s) to "${pendingStatus.status}". This can't be undone.`
              : `This will change order ${pendingStatus.orderId.slice(0, 8)} to "${pendingStatus.status}". This can't be undone.`}
          </p>
        )}
        {statusError && <p style={{ color: 'var(--danger)' }}>{statusError}</p>}
      </Modal>
    </section>
  );
}
