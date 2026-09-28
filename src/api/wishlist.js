import { apiFetch } from './client.js';

function authed(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

// GET /wishlist returns a plain array (WishlistProductResponse[]), unlike
// orders/admin lists which are paginated — see backend/app/api/routes/wishlist.py.
export function fetchWishlist(token) {
  return apiFetch('/wishlist', authed(token));
}

export function addToWishlist(token, productId) {
  return apiFetch('/wishlist/items', authed(token, { method: 'POST', body: JSON.stringify({ product_id: productId }) }));
}

export function removeFromWishlist(token, productId) {
  return apiFetch(`/wishlist/items/${productId}`, authed(token, { method: 'DELETE' }));
}

export function checkWishlistSaved(token, productId) {
  return apiFetch(`/wishlist/items/${productId}`, authed(token));
}
