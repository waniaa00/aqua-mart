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
