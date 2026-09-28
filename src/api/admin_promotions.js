import { apiFetch } from './client.js';

function authed(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

export function listPromotions(token, { page = 1, limit = 20 } = {}) {
  return apiFetch('/admin/promotions', authed(token, { params: { page, limit } }));
}

export function createPromotion(token, data) {
  return apiFetch('/admin/promotions', authed(token, { method: 'POST', body: JSON.stringify(data) }));
}

export function updatePromotion(token, id, data) {
  return apiFetch(`/admin/promotions/${id}`, authed(token, { method: 'PATCH', body: JSON.stringify(data) }));
}

export function deactivatePromotion(token, id) {
  return apiFetch(`/admin/promotions/${id}`, authed(token, { method: 'DELETE' }));
}
