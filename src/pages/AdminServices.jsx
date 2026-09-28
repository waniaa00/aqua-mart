import { useCallback, useEffect, useState } from 'react';
import Modal from '../components/Modal.jsx';
import Drawer from '../components/Drawer.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { listAllServices, createService, updateService, createSlot, updateSlot } from '../api/admin_services.js';
import { fetchSlots } from '../api/services.js';
import { ApiError } from '../api/client.js';

const EMPTY_FORM = { id: null, name: '', description: '', base_price: '', duration_minutes: '', service_type: '', image_url: '' };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminServices() {
  const { token } = useAdminAuth();
  const { format } = useCurrency();

  const [services, setServices] = useState([]);
  const [status, setStatus] = useState('loading');

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [slotService, setSlotService] = useState(null);
  const [slotDate, setSlotDate] = useState(todayIso());
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [newSlotTime, setNewSlotTime] = useState('');
  const [newSlotCapacity, setNewSlotCapacity] = useState('1');
  const [slotError, setSlotError] = useState('');
  const [slotSaving, setSlotSaving] = useState(false);

  const load = useCallback(() => {
    setStatus('loading');
    listAllServices()
      .then((res) => {
        setServices(res);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setError('');
  }

  function openEdit(svc) {
    setForm({
      id: svc.id,
      name: svc.name,
      description: svc.description,
      base_price: String(svc.price.base_price),
      duration_minutes: String(svc.duration_minutes),
      service_type: svc.service_type,
      image_url: svc.image_url ?? '',
    });
    setError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (form.id) {
        await updateService(token, form.id, {
          name: form.name,
          description: form.description,
          base_price: form.base_price,
          duration_minutes: Number(form.duration_minutes),
          image_url: form.image_url || null,
        });
      } else {
        await createService(token, {
          name: form.name,
          description: form.description,
          base_price: form.base_price,
          duration_minutes: Number(form.duration_minutes),
          service_type: form.service_type,
          image_url: form.image_url || null,
        });
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this service.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(svc) {
    await updateService(token, svc.id, { is_active: !svc.is_active });
    load();
  }

  const loadSlots = useCallback(() => {
    if (!slotService) return;
    setSlotsLoading(true);
    fetchSlots(slotService.id, slotDate)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [slotService, slotDate]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  function openSlots(svc) {
    setSlotService(svc);
    setSlotDate(todayIso());
    setNewSlotTime('');
    setNewSlotCapacity('1');
    setSlotError('');
  }

  async function handleCreateSlot(e) {
    e.preventDefault();
    setSlotSaving(true);
    setSlotError('');
    try {
      await createSlot(token, slotService.id, {
        date: slotDate,
        start_time: newSlotTime.length === 5 ? `${newSlotTime}:00` : newSlotTime,
        capacity: Number(newSlotCapacity),
      });
      setNewSlotTime('');
      setNewSlotCapacity('1');
      loadSlots();
    } catch (err) {
      setSlotError(err instanceof ApiError ? err.message : "Couldn't create this slot.");
    } finally {
      setSlotSaving(false);
    }
  }

  async function handleToggleBlock(slot) {
    await updateSlot(token, slot.id, { is_blocked: !slot.is_blocked });
    loadSlots();
  }

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Services</h1>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          New Service
        </button>
      </div>

      {status === 'loading' && <p className="muted">Loading services…</p>}
      {status === 'error' && <p className="muted">Couldn't load services right now.</p>}

      {status === 'ready' && (
        <div className="card card-pad">
          {services.length === 0 ? (
            <p className="muted">No services yet.</p>
          ) : (
            <table className="spec-table">
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <th>
                      {s.name} {!s.is_active && <span className="badge badge-coral">Inactive</span>}
                    </th>
                    <td>{format(s.price)}</td>
                    <td>{s.duration_minutes} min</td>
                    <td>{s.service_type}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openSlots(s)}>
                        Slots
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>
                        Edit
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(s)}>
                        {s.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? 'Edit Service' : 'New Service'}>
        {form && (
          <form onSubmit={handleSave} style={{ display: 'grid', gap: '0.75rem' }}>
            <div className="field">
              <label htmlFor="svc-name">Name</label>
              <input id="svc-name" className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="svc-desc">Description</label>
              <textarea id="svc-desc" className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="svc-price">Base Price (USD)</label>
              <input
                id="svc-price"
                className="input"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.base_price}
                onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="svc-duration">Duration (minutes)</label>
              <input
                id="svc-duration"
                className="input"
                type="number"
                min="1"
                required
                value={form.duration_minutes}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
              />
            </div>
            {!form.id && (
              <div className="field">
                <label htmlFor="svc-type">Service Type</label>
                <input
                  id="svc-type"
                  className="input"
                  required
                  placeholder="e.g. setup, consultation"
                  value={form.service_type}
                  onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))}
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="svc-image">Image URL</label>
              <input id="svc-image" className="input" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
            </div>
            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </Modal>

      <Drawer open={Boolean(slotService)} onClose={() => setSlotService(null)} title={slotService ? `${slotService.name} — Slots` : ''}>
        {slotService && (
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div className="field">
              <label htmlFor="slot-date">Date</label>
              <input id="slot-date" type="date" className="input" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
            </div>

            {slotsLoading && <p className="muted">Loading slots…</p>}
            {!slotsLoading && slots.length === 0 && <p className="muted">No slots on this date.</p>}
            {!slotsLoading &&
              slots.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    {s.start_time} — {s.remaining_capacity}/{s.capacity} available
                    {s.is_blocked && <span className="badge badge-coral" style={{ marginLeft: '0.5rem' }}>blocked</span>}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleToggleBlock(s)}>
                    {s.is_blocked ? 'Unblock' : 'Block'}
                  </button>
                </div>
              ))}

            <form onSubmit={handleCreateSlot} style={{ display: 'grid', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <h4 style={{ margin: 0 }}>Add a slot</h4>
              <div className="field">
                <label htmlFor="new-slot-time">Start Time</label>
                <input id="new-slot-time" type="time" className="input" required value={newSlotTime} onChange={(e) => setNewSlotTime(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="new-slot-capacity">Capacity</label>
                <input
                  id="new-slot-capacity"
                  type="number"
                  min="1"
                  className="input"
                  required
                  value={newSlotCapacity}
                  onChange={(e) => setNewSlotCapacity(e.target.value)}
                />
              </div>
              {slotError && <p style={{ color: 'var(--danger)' }}>{slotError}</p>}
              <button type="submit" className="btn btn-primary btn-sm" disabled={slotSaving}>
                {slotSaving ? 'Adding…' : 'Add Slot'}
              </button>
            </form>
          </div>
        )}
      </Drawer>
    </section>
  );
}
