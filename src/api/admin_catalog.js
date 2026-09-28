import { apiFetch } from './client.js';

function authed(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

export function createProduct(token, data) {
  return apiFetch('/products', authed(token, { method: 'POST', body: JSON.stringify(data) }));
}

export function updateProduct(token, id, data) {
  return apiFetch(`/products/${id}`, authed(token, { method: 'PATCH', body: JSON.stringify(data) }));
}

export function archiveProduct(token, id) {
  return apiFetch(`/products/${id}`, authed(token, { method: 'PATCH', body: JSON.stringify({ status: 'archived' }) }));
}

export function createCategory(token, data) {
  return apiFetch('/categories', authed(token, { method: 'POST', body: JSON.stringify(data) }));
}

export function updateCategory(token, id, data) {
  return apiFetch(`/categories/${id}`, authed(token, { method: 'PATCH', body: JSON.stringify(data) }));
}
