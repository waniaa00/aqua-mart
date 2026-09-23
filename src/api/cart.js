import { apiFetch } from './client.js';

function authed(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

export function getCart(token, currency) {
  return apiFetch('/cart', authed(token, { params: { currency } }));
}

export function addItem(token, productId, quantity, currency) {
  return apiFetch(
    '/cart/items',
    authed(token, { method: 'POST', body: JSON.stringify({ product_id: productId, quantity }), params: { currency } })
  );
}

export function updateItem(token, productId, quantity, currency) {
  return apiFetch(`/cart/items/${productId}`, authed(token, { method: 'PATCH', body: JSON.stringify({ quantity }), params: { currency } }));
}

export function removeItem(token, productId, currency) {
  return apiFetch(`/cart/items/${productId}`, authed(token, { method: 'DELETE', params: { currency } }));
}

export function applyCoupon(token, code, currency) {
  return apiFetch('/cart/coupon', authed(token, { method: 'POST', body: JSON.stringify({ code }), params: { currency } }));
}

export function removeCoupon(token, currency) {
  return apiFetch('/cart/coupon', authed(token, { method: 'DELETE', params: { currency } }));
}
