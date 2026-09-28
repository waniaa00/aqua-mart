import { apiFetch } from './client.js';

function authed(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

export function listCustomers(token, { search, page = 1, limit = 20 } = {}) {
  return apiFetch('/admin/customers', authed(token, { params: { search, page, limit } }));
}

export function getCustomerDetail(token, id) {
  return apiFetch(`/admin/customers/${id}`, authed(token));
}
