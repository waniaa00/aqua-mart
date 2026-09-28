import { useCallback, useEffect, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { fetchProducts, fetchCategories, fetchProductBySlug } from '../api/products.js';
import { createProduct, updateProduct, archiveProduct } from '../api/admin_catalog.js';
import { ApiError } from '../api/client.js';

const PRODUCT_TYPES = ['fish', 'equipment', 'supply'];
const STATUSES = ['draft', 'active', 'out_of_stock', 'archived'];

const EMPTY_FORM = {
  name: '',
  slug: '',
  sku: '',
  short_description: '',
  description: '',
  category_id: '',
  base_price: '',
  product_type: 'equipment',
  initial_stock_quantity: 0,
  low_stock_threshold: 5,
  is_featured: false,
  status: 'active',
  fish_details: {
    species: '',
    common_name: '',
    freshwater_or_marine: '',
    size: '',
    temperament: '',
    difficulty: '',
    min_tank_size_liters: '',
    diet: '',
    care_instructions: '',
  },
};

export default function AdminProducts() {
  const { token } = useAdminAuth();
  const { format } = useCurrency();

  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState(null); // null | EMPTY_FORM-shaped object (with optional id/slug)
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetchProducts({ search, limit: 100 })
      .then((res) => setRows(res.items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  async function openEdit(row) {
    const detail = await fetchProductBySlug(row.id);
    setForm({
      id: detail.productId,
      name: detail.name,
      slug: detail.id,
      sku: detail.sku ?? '',
      short_description: detail.tagline ?? '',
      description: detail.description ?? '',
      category_id: categories.find((c) => c.slug === detail.category)?.id ?? '',
      base_price: detail.price?.base_price ?? '',
      product_type: detail.productType,
      status: detail.status ?? 'active',
      is_featured: detail.badges?.includes('Featured') ?? false,
      fish_details:
        detail.productType === 'fish' && detail.fishDetails
          ? Object.fromEntries(Object.keys(EMPTY_FORM.fish_details).map((k) => [k, detail.fishDetails[k] ?? '']))
          : { ...EMPTY_FORM.fish_details },
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const fishDetails = form.product_type === 'fish' ? Object.fromEntries(Object.entries(form.fish_details).filter(([, v]) => v !== '')) : null;
      if (form.id) {
        await updateProduct(token, form.id, {
          name: form.name,
          description: form.description,
          short_description: form.short_description,
          base_price: form.base_price,
          category_id: form.category_id || null,
          status: form.status,
          is_featured: form.is_featured,
          fish_details: fishDetails,
        });
      } else {
        const created = await createProduct(token, {
          name: form.name,
          slug: form.slug,
          sku: form.sku,
          description: form.description,
          short_description: form.short_description,
          base_price: form.base_price,
          category_id: form.category_id || null,
          product_type: form.product_type,
          is_featured: form.is_featured,
          initial_stock_quantity: Number(form.initial_stock_quantity) || 0,
          low_stock_threshold: Number(form.low_stock_threshold) || 5,
          fish_details: fishDetails,
        });
        // CreateProductRequest has no `status` field — the backend always
        // creates products as `draft` (confirmed against the schema), but
        // FR-020a requires a new product be "immediately visible in the
        // live catalog." A second call activating it is the only way to
        // satisfy that without a backend change.
        await updateProduct(token, created.id, { status: 'active' });
      }
      setForm(null);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't save this product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    await archiveProduct(token, confirmArchive.productId);
    setConfirmArchive(null);
    load();
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'productType', label: 'Type' },
    { key: 'price', label: 'Price', render: (p) => format(p.price) },
    { key: 'edit', label: '', render: (p) => <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button> },
    { key: 'archive', label: '', render: (p) => <button className="btn btn-ghost btn-sm" onClick={() => setConfirmArchive(p)}>Archive</button> },
  ];

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Products</h1>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setForm({ ...EMPTY_FORM, fish_details: { ...EMPTY_FORM.fish_details } })}>
          New Product
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p.productId}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search products…"
        loading={loading}
        error={error}
        onRetry={load}
        emptyMessage="No products match this search."
      />

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? 'Edit Product' : 'New Product'}>
        {form && (
          <form onSubmit={handleSave} style={{ display: 'grid', gap: '0.25rem' }}>
            <div className="field">
              <label htmlFor="p-name">Name</label>
              <input id="p-name" className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            {!form.id && (
              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor="p-slug">Slug</label>
                  <input id="p-slug" className="input" required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="p-sku">SKU</label>
                  <input id="p-sku" className="input" required value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="field">
              <label htmlFor="p-short">Short Description</label>
              <input id="p-short" className="input" value={form.short_description} onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="p-desc">Description</label>
              <textarea id="p-desc" className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="p-category">Category</label>
                <select id="p-category" className="input" value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="p-price">Base Price (USD)</label>
                <input id="p-price" type="number" step="0.01" min="0" className="input" required value={form.base_price} onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))} />
              </div>
            </div>
            {!form.id && (
              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor="p-type">Product Type</label>
                  <select id="p-type" className="input" value={form.product_type} onChange={(e) => setForm((f) => ({ ...f, product_type: e.target.value }))}>
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="p-stock">Initial Stock</label>
                  <input id="p-stock" type="number" min="0" className="input" value={form.initial_stock_quantity} onChange={(e) => setForm((f) => ({ ...f, initial_stock_quantity: e.target.value }))} />
                </div>
              </div>
            )}
            {form.id && (
              <div className="field">
                <label htmlFor="p-status">Status</label>
                <select id="p-status" className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input id="p-featured" type="checkbox" checked={form.is_featured} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} />
              <label htmlFor="p-featured" style={{ margin: 0 }}>
                Featured
              </label>
            </div>

            {form.product_type === 'fish' && (
              <fieldset style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginTop: '0.5rem' }}>
                <legend className="muted">Fish Details</legend>
                <div className="grid grid-2">
                  <div className="field">
                    <label htmlFor="fd-species">Species</label>
                    <input id="fd-species" className="input" value={form.fish_details.species} onChange={(e) => setForm((f) => ({ ...f, fish_details: { ...f.fish_details, species: e.target.value } }))} />
                  </div>
                  <div className="field">
                    <label htmlFor="fd-common">Common Name</label>
                    <input id="fd-common" className="input" value={form.fish_details.common_name} onChange={(e) => setForm((f) => ({ ...f, fish_details: { ...f.fish_details, common_name: e.target.value } }))} />
                  </div>
                  <div className="field">
                    <label htmlFor="fd-water">Freshwater/Marine</label>
                    <select id="fd-water" className="input" value={form.fish_details.freshwater_or_marine} onChange={(e) => setForm((f) => ({ ...f, fish_details: { ...f.fish_details, freshwater_or_marine: e.target.value } }))}>
                      <option value="">—</option>
                      <option value="freshwater">Freshwater</option>
                      <option value="marine">Marine</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="fd-difficulty">Difficulty</label>
                    <input id="fd-difficulty" className="input" value={form.fish_details.difficulty} onChange={(e) => setForm((f) => ({ ...f, fish_details: { ...f.fish_details, difficulty: e.target.value } }))} />
                  </div>
                  <div className="field">
                    <label htmlFor="fd-size">Size</label>
                    <input id="fd-size" className="input" value={form.fish_details.size} onChange={(e) => setForm((f) => ({ ...f, fish_details: { ...f.fish_details, size: e.target.value } }))} />
                  </div>
                  <div className="field">
                    <label htmlFor="fd-temperament">Temperament</label>
                    <input id="fd-temperament" className="input" value={form.fish_details.temperament} onChange={(e) => setForm((f) => ({ ...f, fish_details: { ...f.fish_details, temperament: e.target.value } }))} />
                  </div>
                  <div className="field">
                    <label htmlFor="fd-tank">Min. Tank Size (L)</label>
                    <input id="fd-tank" type="number" min="0" className="input" value={form.fish_details.min_tank_size_liters} onChange={(e) => setForm((f) => ({ ...f, fish_details: { ...f.fish_details, min_tank_size_liters: e.target.value } }))} />
                  </div>
                  <div className="field">
                    <label htmlFor="fd-diet">Diet</label>
                    <input id="fd-diet" className="input" value={form.fish_details.diet} onChange={(e) => setForm((f) => ({ ...f, fish_details: { ...f.fish_details, diet: e.target.value } }))} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="fd-care">Care Instructions</label>
                  <textarea id="fd-care" className="input" value={form.fish_details.care_instructions} onChange={(e) => setForm((f) => ({ ...f, fish_details: { ...f.fish_details, care_instructions: e.target.value } }))} />
                </div>
              </fieldset>
            )}

            {formError && <p style={{ color: 'var(--danger)' }}>{formError}</p>}
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '0.5rem' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(confirmArchive)}
        onClose={() => setConfirmArchive(null)}
        title="Archive product?"
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmArchive(null)}>
              Cancel
            </button>
            <button className="btn btn-coral btn-sm" onClick={handleArchive}>
              Archive
            </button>
          </>
        }
      >
        <p>
          This will remove "{confirmArchive?.name}" from the live shop. Historical orders referencing it are
          unaffected. This can be undone by editing its status back to active.
        </p>
      </Modal>
    </section>
  );
}
