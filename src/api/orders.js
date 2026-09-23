import { apiFetch } from './client.js';

function authed(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

export function checkout(token, addressId) {
  return apiFetch('/orders', authed(token, { method: 'POST', body: JSON.stringify({ address_id: addressId }) }));
}

export function fetchOrders(token, { page = 1, limit = 20 } = {}) {
  return apiFetch('/orders', authed(token, { params: { page, limit } }));
}
