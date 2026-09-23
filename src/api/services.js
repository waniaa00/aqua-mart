import { apiFetch } from './client.js';
import { adaptService } from './adapters.js';

export async function fetchServices() {
  const services = await apiFetch('/services');
  return services.map(adaptService);
}

export async function fetchServiceById(id) {
  const service = await apiFetch(`/services/${id}`);
  return adaptService(service);
}

// date: 'YYYY-MM-DD'. Returns raw SlotResponse objects (id, date,
// start_time, capacity, remaining_capacity, is_blocked) — no adapter needed,
// booking uses the slot id directly.
export function fetchSlots(serviceId, date) {
  return apiFetch(`/services/${serviceId}/slots`, { params: { date } });
}
