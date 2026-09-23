import { apiFetch } from './client.js';

function authed(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

export function getCart(token) {
  return apiFetch('/cart', authed(token));
}

export function addItem(token, productId, quantity) {
  return apiFetch('/cart/items', authed(token, { method: 'POST', body: JSON.stringify({ product_id: productId, quantity }) }));
}

export function updateItem(token, productId, quantity) {
  return apiFetch(`/cart/items/${productId}`, authed(token, { method: 'PATCH', body: JSON.stringify({ quantity }) }));
}

export function removeItem(token, productId) {
  return apiFetch(`/cart/items/${productId}`, authed(token, { method: 'DELETE' }));
}

export function applyCoupon(token, code) {
  return apiFetch('/cart/coupon', authed(token, { method: 'POST', body: JSON.stringify({ code }) }));
}

export function removeCoupon(token) {
  return apiFetch('/cart/coupon', authed(token, { method: 'DELETE' }));
}
