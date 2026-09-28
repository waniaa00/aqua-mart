import { apiFetch } from './client.js';

function authed(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

// No bulk cross-product review-list endpoint exists (see
// contracts/reused-endpoints-map.md) — admin moderation fans out per
// product via the same endpoint the public product page would use.
export function listProductReviews(productId) {
  return apiFetch(`/products/${productId}/reviews`);
}

export function moderateReview(token, id) {
  return apiFetch(`/admin/reviews/${id}`, authed(token, { method: 'DELETE' }));
}
