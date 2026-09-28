import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { listPromotions, createPromotion, updatePromotion, deactivatePromotion } from '../api/admin_promotions.js';
import { ApiError } from '../api/client.js';

const EMPTY_FORM = {
  id: null,
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  start_date: '',
  end_date: '',
  min_order_amount: '',
  max_discount_amount: '',
  usage_limit: '',
};

// A <input type="datetime-local"> holds local wall-clock digits with no
// timezone info — populating one from a UTC ISO string requires shifting
// the instant by the host's offset first, not just slicing the UTC
// digits (which silently drifts the value by the offset on every
// edit-without-touching-the-date round trip: populate from UTC digits,
// then re-parse those digits as local time on save).
function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function isExpired(promo) {
  return new Date(promo.end_date) < new Date();
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminPromotions() {
  const { token } = useAdminAuth();
  const [promotions, setPromotions] = useState([]);
  const [status, setStatus] = useState('loading');
  const [filter, setFilter] = useState(''); // '' | 'active' | 'expired'

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    setStatus('loading');
    listPromotions(token, { page: 1, limit: 100 })
      .then((res) => {
        setPromotions(res.items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    if (filter === 'active') return promotions.filter((p) => p.is_active && !isExpired(p));
    if (filter === 'expired') return promotions.filter((p) => !p.is_active || isExpired(p));
    return promotions;
  }, [promotions, filter]);

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setError('');
  }

  function openEdit(promo) {
    setForm({
      id: promo.id,
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: String(promo.discount_value),
      start_date: toDatetimeLocal(promo.start_date),
      end_date: toDatetimeLocal(promo.end_date),
      min_order_amount: promo.min_order_amount != null ? String(promo.min_order_amount) : '',
      max_discount_amount: promo.max_discount_amount != null ? String(promo.max_discount_amount) : '',
      usage_limit: promo.usage_limit != null ? String(promo.usage_limit) : '',
    });
    setError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (form.id) {
        await updatePromotion(token, form.id, {
          discount_type: form.discount_type,
          discount_value: form.discount_value,
          start_date: new Date(form.start_date).toISOString(),
          end_date: new Date(form.end_date).toISOString(),
          min_order_amount: form.min_order_amount || null,
          max_discount_amount: form.max_discount_amount || null,
          usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        });
      } else {
        await createPromotion(token, {
          code: form.code,
          discount_type: form.discount_type,
          discount_value: form.discount_value,
          start_date: new Date(form.start_date).toISOString(),
          end_date: new Date(form.end_date).toISOString(),
          min_order_amount: form.min_order_amount || null,
          max_discount_amount: form.max_discount_amount || null,
          usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        });
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this promotion.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(promo) {
    await deactivatePromotion(token, promo.id);
    load();
  }

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Promotions</h1>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          New Promotion
        </button>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <select className="input" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All promotions</option>
          <option value="active">Active</option>
          <option value="expired">Expired / inactive</option>
        </select>
      </div>

      {status === 'loading' && <p className="muted">Loading promotions…</p>}
      {status === 'error' && <p className="muted">Couldn't load promotions right now.</p>}

      {status === 'ready' && (
        <div className="card card-pad">
          {visible.length === 0 ? (
            <p className="muted">No promotions match this filter.</p>
          ) : (
            <table className="spec-table">
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <th>
                      {p.code}{' '}
                      {p.is_active && !isExpired(p) ? (
                        <span className="badge badge-success">active</span>
                      ) : (
                        <span className="badge badge-coral">{p.is_active ? 'expired' : 'inactive'}</span>
                      )}
                    </th>
                    <td>{p.discount_type === 'percentage' ? `${p.discount_value}%` : `$${p.discount_value}`}</td>
                    <td>
                      {formatDate(p.start_date)} – {formatDate(p.end_date)}
                    </td>
                    <td>
                      {p.times_used}
                      {p.usage_limit != null ? ` / ${p.usage_limit}` : ''} used
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                        Edit
                      </button>
                      {p.is_active && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDeactivate(p)}>
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? 'Edit Promotion' : 'New Promotion'}>
        {form && (
          <form onSubmit={handleSave} style={{ display: 'grid', gap: '0.75rem' }}>
            <div className="field">
              <label htmlFor="promo-code">Code</label>
              <input
                id="promo-code"
                className="input"
                required
                disabled={Boolean(form.id)}
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="field">
              <label htmlFor="promo-type">Discount Type</label>
              <select id="promo-type" className="input" value={form.discount_type} onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="promo-value">Discount Value</label>
              <input
                id="promo-value"
                className="input"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.discount_value}
                onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="promo-start">Start Date</label>
              <input
                id="promo-start"
                className="input"
                type="datetime-local"
                required
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="promo-end">End Date</label>
              <input
                id="promo-end"
                className="input"
                type="datetime-local"
                required
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="promo-min">Min Order Amount</label>
              <input
                id="promo-min"
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.min_order_amount}
                onChange={(e) => setForm((f) => ({ ...f, min_order_amount: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="promo-max">Max Discount Amount</label>
              <input
                id="promo-max"
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.max_discount_amount}
                onChange={(e) => setForm((f) => ({ ...f, max_discount_amount: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="promo-limit">Usage Limit</label>
              <input
                id="promo-limit"
                className="input"
                type="number"
                min="0"
                step="1"
                value={form.usage_limit}
                onChange={(e) => setForm((f) => ({ ...f, usage_limit: e.target.value }))}
              />
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
