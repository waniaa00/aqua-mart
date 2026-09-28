import { apiFetch } from './client.js';

function authed(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

export function listAppointments(token, { date, status, page = 1, limit = 50 } = {}) {
  return apiFetch('/admin/appointments', authed(token, { params: { date, status, page, limit } }));
}

export function updateAppointmentStatus(token, id, status) {
  return apiFetch(`/admin/appointments/${id}/status`, authed(token, { method: 'PATCH', body: JSON.stringify({ status }) }));
}

export function rescheduleAppointment(token, id, newSlotId) {
  return apiFetch(`/admin/appointments/${id}/reschedule`, authed(token, { method: 'POST', body: JSON.stringify({ new_slot_id: newSlotId }) }));
}
