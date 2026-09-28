import { useCallback, useEffect, useState } from 'react';
import Modal from '../components/Modal.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { fetchCategories } from '../api/products.js';
import { createCategory, updateCategory } from '../api/admin_catalog.js';
import { ApiError } from '../api/client.js';

const EMPTY_FORM = { name: '', parent_id: '' };

export default function AdminCategories() {
  const { token } = useAdminAuth();
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading');
  const [form, setForm] = useState(null); // { id?, name, parent_id } | null
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setStatus('loading');
    fetchCategories()
      .then((res) => {
        setCategories(res);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { name: form.name, parent_id: form.parent_id || null };
      if (form.id) {
        await updateCategory(token, form.id, payload);
      } else {
        await createCategory(token, payload);
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this category.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleArchive(category) {
    await updateCategory(token, category.id, { is_archived: !category.is_archived });
    load();
  }

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Categories</h1>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setForm({ ...EMPTY_FORM })}>
          New Category
        </button>
      </div>

      {status === 'loading' && <p className="muted">Loading categories…</p>}
      {status === 'error' && <p className="muted">Couldn't load categories right now.</p>}

      {status === 'ready' && (
        <div className="card card-pad">
          {categories.length === 0 ? (
            <p className="muted">No categories yet.</p>
          ) : (
            <table className="spec-table">
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <th>
                      {c.name} {c.is_archived && <span className="badge badge-coral">Archived</span>}
                    </th>
                    <td>{categories.find((p) => p.id === c.parent_id)?.name ?? '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setForm({ id: c.id, name: c.name, parent_id: c.parent_id ?? '' })}>
                        Edit
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleToggleArchive(c)}>
                        {c.is_archived ? 'Unarchive' : 'Archive'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? 'Edit Category' : 'New Category'}>
        {form && (
          <form onSubmit={handleSave}>
            <div className="field">
              <label htmlFor="cat-name">Name</label>
              <input id="cat-name" className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="cat-parent">Parent Category</label>
              <select id="cat-parent" className="input" value={form.parent_id} onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}>
                <option value="">None (top-level)</option>
                {categories
                  .filter((c) => c.id !== form.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </Modal>
    </section>
  );
}
