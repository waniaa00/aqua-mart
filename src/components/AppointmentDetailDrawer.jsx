import { useState } from 'react';
import Drawer from './Drawer.jsx';
import Modal from './Modal.jsx';
import { cancelAppointment } from '../api/appointments.js';
import { ApiError } from '../api/client.js';

const STATUS_BADGE = {
  completed: 'badge-success',
  confirmed: 'badge-success',
  cancelled: 'badge-coral',
};

// No `location` field exists on the backend's AppointmentResponse
// (service_id/service_name/slot_id/date/start_time/status/notes only —
// verified against app/schemas/service.py) — omitted rather than
// fabricated, per constitution §31 (No Fake Functionality).
export default function AppointmentDetailDrawer({ appointment, token, open, onClose, onCancelled }) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const canCancel = appointment && appointment.status !== 'cancelled' && appointment.status !== 'completed';

  async function handleConfirmCancel() {
    setCancelling(true);
    setError('');
    try {
      const updated = await cancelAppointment(token, appointment.id);
      setConfirming(false);
      onCancelled?.(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't cancel this appointment.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <Drawer open={open} onClose={onClose} title={appointment ? appointment.service_name : ''}>
        {appointment && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <span className={`badge ${STATUS_BADGE[appointment.status] ?? 'badge'}`}>{appointment.status}</span>
            <div>
              <p className="muted" style={{ margin: 0 }}>Date &amp; Time</p>
              <p style={{ margin: '0.25rem 0 0' }}>
                {appointment.date} · {appointment.start_time}
              </p>
            </div>
            {appointment.notes && (
              <div>
                <p className="muted" style={{ margin: 0 }}>Notes</p>
                <p style={{ margin: '0.25rem 0 0' }}>{appointment.notes}</p>
              </div>
            )}
            {canCancel ? (
              <button className="btn btn-coral btn-sm" onClick={() => setConfirming(true)} style={{ justifySelf: 'start' }}>
                Cancel Appointment
              </button>
            ) : (
              <p className="muted">
                This appointment can't be cancelled because it's already {appointment.status}.
              </p>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Cancel appointment?"
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)} disabled={cancelling}>
              Never mind
            </button>
            <button className="btn btn-coral btn-sm" onClick={handleConfirmCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel it'}
            </button>
          </>
        }
      >
        <p>
          This will cancel your {appointment?.service_name} appointment on {appointment?.date}. This can't be
          undone.
        </p>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      </Modal>
    </>
  );
}
