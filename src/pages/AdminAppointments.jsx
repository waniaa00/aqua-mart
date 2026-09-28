import { useCallback, useEffect, useRef, useState } from 'react';
import Drawer from '../components/Drawer.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { listAppointments, updateAppointmentStatus, rescheduleAppointment } from '../api/admin_appointments.js';
import { fetchSlots } from '../api/services.js';
import { ApiError } from '../api/client.js';

const STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];

const STATUS_BADGE = {
  completed: 'badge-success',
  confirmed: 'badge-success',
  cancelled: 'badge-coral',
  no_show: 'badge-coral',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function AdminAppointments() {
  const { token } = useAdminAuth();
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [detail, setDetail] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState('');

  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const requestKeyRef = useRef(null);

  const load = useCallback(() => {
    if (!token) return;
    const requestKey = `${date}|${status}`;
    requestKeyRef.current = requestKey;
    setLoading(true);
    setError(false);
    listAppointments(token, { date, status: status || undefined })
      .then((res) => {
        if (requestKeyRef.current !== requestKey) return; // a newer date/status request superseded this one
        setRows(res.items.sort((a, b) => a.start_time.localeCompare(b.start_time)));
      })
      .catch(() => {
        if (requestKeyRef.current !== requestKey) return;
        setError(true);
      })
      .finally(() => {
        if (requestKeyRef.current !== requestKey) return;
        setLoading(false);
      });
  }, [token, date, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(newStatus) {
    setStatusSaving(true);
    setStatusError('');
    try {
      const updated = await updateAppointmentStatus(token, detail.id, newStatus);
      setDetail(updated);
      load();
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : "Couldn't update status.");
    } finally {
      setStatusSaving(false);
    }
  }

  function openReschedule() {
    setRescheduling(true);
    setRescheduleDate(shiftDate(date, 1));
    setSlots([]);
  }

  useEffect(() => {
    if (!rescheduling || !detail) return;
    setSlotsLoading(true);
    fetchSlots(detail.service_id, rescheduleDate)
      .then((res) => setSlots(res.filter((s) => !s.is_blocked && s.remaining_capacity > 0)))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [rescheduling, detail, rescheduleDate]);

  async function handleReschedule(slotId) {
    setStatusSaving(true);
    setStatusError('');
    try {
      const updated = await rescheduleAppointment(token, detail.id, slotId);
      setDetail(updated);
      setRescheduling(false);
      load();
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : "Couldn't reschedule this appointment.");
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Appointments</h1>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setDate((d) => shiftDate(d, -1))}>
          ← Prev
        </button>
        <input type="date" className="input" style={{ width: 'auto' }} value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn btn-ghost btn-sm" onClick={() => setDate((d) => shiftDate(d, 1))}>
          Next →
        </button>
        <select className="input" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="muted">Loading appointments…</p>}
      {error && <p className="muted">Couldn't load appointments right now.</p>}
      {!loading && !error && rows.length === 0 && <p className="muted">No appointments on this date.</p>}

      {!loading && !error && rows.length > 0 && (
        <div className="card card-pad">
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {rows.map((a) => (
              <button key={a.id} type="button" className="dashboard-list-row" onClick={() => setDetail(a)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <strong>{a.start_time}</strong> — {a.service_name}
                  </span>
                  <span className={`badge ${STATUS_BADGE[a.status] ?? 'badge'}`}>{a.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <Drawer open={Boolean(detail)} onClose={() => (setDetail(null), setRescheduling(false))} title={detail?.service_name ?? ''}>
        {detail && !rescheduling && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <span className={`badge ${STATUS_BADGE[detail.status] ?? 'badge'}`}>{detail.status}</span>
            <p className="muted" style={{ margin: 0 }}>
              {detail.date} · {detail.start_time}
            </p>
            {detail.notes && <p style={{ margin: 0 }}>{detail.notes}</p>}

            <div className="field">
              <label htmlFor="appt-status">Update Status</label>
              <select
                id="appt-status"
                className="input"
                value=""
                onChange={(e) => e.target.value && handleStatusChange(e.target.value)}
                disabled={statusSaving}
              >
                <option value="">Select new status…</option>
                {STATUSES.filter((s) => s !== detail.status).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-outline btn-sm" onClick={openReschedule} style={{ justifySelf: 'start' }}>
              Reschedule
            </button>
            {statusError && <p style={{ color: 'var(--danger)' }}>{statusError}</p>}
          </div>
        )}

        {detail && rescheduling && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setRescheduling(false)} style={{ justifySelf: 'start' }}>
              ← Back
            </button>
            <div className="field">
              <label htmlFor="reschedule-date">New Date</label>
              <input id="reschedule-date" type="date" className="input" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
            </div>
            {slotsLoading && <p className="muted">Loading available slots…</p>}
            {!slotsLoading && slots.length === 0 && <p className="muted">No available slots on this date.</p>}
            {!slotsLoading && slots.length > 0 && (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {slots.map((s) => (
                  <button key={s.id} className="btn btn-outline btn-sm" onClick={() => handleReschedule(s.id)} disabled={statusSaving}>
                    {s.start_time} ({s.remaining_capacity} left)
                  </button>
                ))}
              </div>
            )}
            {statusError && <p style={{ color: 'var(--danger)' }}>{statusError}</p>}
          </div>
        )}
      </Drawer>
    </section>
  );
}
