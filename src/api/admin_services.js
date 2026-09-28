import { apiFetch } from './client.js';

function authed(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

// The public endpoint's `active` param isn't a filter-to-this-value flag
// despite the name — reading appointment_service.list_services, passing
// active=false skips the is_active WHERE clause entirely rather than
// filtering to inactive ones, so it returns every service, active and
// inactive alike. That's exactly what admin management needs (to see and
// reactivate inactive services too), in a single call.
export function listAllServices() {
  return apiFetch('/services', { params: { active: false } });
}

export function createService(token, data) {
  return apiFetch('/services', authed(token, { method: 'POST', body: JSON.stringify(data) }));
}

export function updateService(token, id, data) {
  return apiFetch(`/services/${id}`, authed(token, { method: 'PATCH', body: JSON.stringify(data) }));
}

export function createSlot(token, serviceId, data) {
  return apiFetch(`/admin/services/${serviceId}/slots`, authed(token, { method: 'POST', body: JSON.stringify(data) }));
}

export function updateSlot(token, slotId, data) {
  return apiFetch(`/admin/slots/${slotId}`, authed(token, { method: 'PATCH', body: JSON.stringify(data) }));
}
