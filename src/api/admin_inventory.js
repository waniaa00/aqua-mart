import { apiFetch } from './client.js';

export function updateInventory(token, productId, data) {
  return apiFetch(`/products/${productId}/inventory`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}
