import { useCallback, useEffect, useMemo, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import Icon from '../components/Icon.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { fetchProducts, fetchCategories } from '../api/products.js';
import { fetchDashboardSummary } from '../api/admin.js';
import { updateInventory } from '../api/admin_inventory.js';
import { ApiError } from '../api/client.js';

export default function AdminInventory() {
  const { token } = useAdminAuth();

  const [search, setSearch] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lowStock, setLowStock] = useState(null);
  const [editing, setEditing] = useState({}); // { [productId]: draftValue }
  const [savingId, setSavingId] = useState(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(false);
    fetchProducts({ search, category: category || undefined, stockStatus: stockStatus || undefined, limit: 100 })
      .then((res) => setRows(res.items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token, search, category, stockStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token) return;
    fetchDashboardSummary(token)
      .then((res) => setLowStock(res.low_stock_products))
      .catch(() => {});
  }, [token]);

  // Counts are computed from this same `limit=100` fetch (unfiltered by
  // stock_status) rather than 4 separate count-only requests — fine at
  // this app's scale (constitution §34), same tradeoff already made for
  // order/appointment counts on Dashboard.jsx.
  const [allRows, setAllRows] = useState([]);
  useEffect(() => {
    if (!token) return;
    fetchProducts({ limit: 100 }).then((res) => setAllRows(res.items)).catch(() => {});
  }, [token]);

  const counts = useMemo(() => {
    const total = allRows.length;
    const outOfStock = allRows.filter((p) => p.stockQuantity <= 0).length;
    const lowIds = new Set((lowStock ?? []).map((p) => p.id));
    const low = allRows.filter((p) => p.stockQuantity > 0 && lowIds.has(p.productId)).length;
    const inStock = total - outOfStock - low;
    return { total, inStock, low, outOfStock };
  }, [allRows, lowStock]);

  async function handleSave(productId) {
    const value = Number(editing[productId]);
    if (!Number.isFinite(value) || value < 0) {
      setSaveError('Enter a non-negative number.');
      return;
    }
    setSavingId(productId);
    setSaveError('');
    try {
      await updateInventory(token, productId, { stock_quantity: value });
      setEditing((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      load();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Couldn't update stock.");
    } finally {
      setSavingId(null);
    }
  }

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Product', render: (p) => p.name },
      { key: 'categoryLabel', label: 'Category', render: (p) => p.categoryLabel ?? '—' },
      {
        key: 'stockQuantity',
        label: 'Stock',
        render: (p) =>
          editing[p.productId] !== undefined ? (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input
                type="number"
                min="0"
                className="input"
                style={{ width: '5rem' }}
                value={editing[p.productId]}
                onChange={(e) => setEditing((prev) => ({ ...prev, [p.productId]: e.target.value }))}
              />
              <button className="btn btn-primary btn-sm" onClick={() => handleSave(p.productId)} disabled={savingId === p.productId}>
                {savingId === p.productId ? '…' : 'Save'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setEditing((prev) => {
                    const next = { ...prev };
                    delete next[p.productId];
                    return next;
                  })
                }
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing((prev) => ({ ...prev, [p.productId]: p.stockQuantity }))}>
              {p.stockQuantity} <Icon name="sliders" size={12} />
            </button>
          ),
      },
      { key: 'status', label: 'Status', render: (p) => <span className={`badge ${p.stockQuantity <= 0 ? 'badge-coral' : ''}`}>{p.stockQuantity <= 0 ? 'Out of Stock' : p.availability ?? 'In Stock'}</span> },
    ],
    [editing, savingId]
  );

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Inventory</h1>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card card-pad">
          <span className="muted">Total Products</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{counts.total}</div>
        </div>
        <div className="card card-pad">
          <span className="muted">In Stock</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{counts.inStock}</div>
        </div>
        <div className="card card-pad">
          <span className="muted">Low Stock</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{counts.low}</div>
        </div>
        <div className="card card-pad">
          <span className="muted">Out of Stock</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{counts.outOfStock}</div>
        </div>
      </div>

      {lowStock && lowStock.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Low Stock Alerts</h3>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {lowStock.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{p.name}</span>
                <span className="muted">
                  {p.stock_quantity} left (threshold {p.low_stock_threshold})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {saveError && <p style={{ color: 'var(--danger)' }}>{saveError}</p>}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p.productId}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search products…"
        filters={
          <>
            <select className="input" style={{ width: 'auto' }} value={stockStatus} onChange={(e) => setStockStatus(e.target.value)}>
              <option value="">All stock statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
            <select className="input" style={{ width: 'auto' }} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        }
        loading={loading}
        error={error}
        onRetry={load}
        emptyMessage="No products match this filter."
      />
    </section>
  );
}
