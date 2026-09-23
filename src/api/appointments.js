import { apiFetch } from './client.js';

function authed(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

export function bookAppointment(token, { serviceId, slotId, addressId, notes }) {
  return apiFetch(
    '/appointments',
    authed(token, {
      method: 'POST',
      body: JSON.stringify({ service_id: serviceId, slot_id: slotId, address_id: addressId ?? null, notes: notes ?? null }),
    })
  );
}

export function fetchAppointments(token) {
  return apiFetch('/appointments', authed(token));
}

export function cancelAppointment(token, appointmentId) {
  return apiFetch(`/appointments/${appointmentId}/cancel`, authed(token, { method: 'POST' }));
}
