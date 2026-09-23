import { apiFetch } from './client.js';

function authed(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

export function fetchProfile(token) {
  return apiFetch('/users/me', authed(token));
}

export function updateProfile(token, data) {
  return apiFetch('/users/me', authed(token, { method: 'PATCH', body: JSON.stringify(data) }));
}

export function fetchAddresses(token) {
  return apiFetch('/users/me/addresses', authed(token));
}

export function createAddress(token, data) {
  return apiFetch('/users/me/addresses', authed(token, { method: 'POST', body: JSON.stringify(data) }));
}

export function updateAddress(token, id, data) {
  return apiFetch(`/users/me/addresses/${id}`, authed(token, { method: 'PATCH', body: JSON.stringify(data) }));
}

export function deleteAddress(token, id) {
  return apiFetch(`/users/me/addresses/${id}`, authed(token, { method: 'DELETE' }));
}

export function setDefaultAddress(token, id) {
  return apiFetch(`/users/me/addresses/${id}/default`, authed(token, { method: 'POST' }));
}

export async function fetchOrders(token, { page = 1, limit = 20 } = {}) {
  return apiFetch('/orders', authed(token, { params: { page, limit } }));
}
