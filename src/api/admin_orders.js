import { apiFetch } from './client.js';

function authed(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

export function listOrders(token, { search, status, dateFrom, dateTo, customerId, sort, page = 1, limit = 20 } = {}) {
  return apiFetch(
    '/admin/orders',
    authed(token, {
      params: { search, status, date_from: dateFrom, date_to: dateTo, customer_id: customerId, sort, page, limit },
    })
  );
}

export function getOrder(token, id) {
  return apiFetch(`/admin/orders/${id}`, authed(token));
}

export function updateOrderStatus(token, id, status) {
  return apiFetch(`/admin/orders/${id}/status`, authed(token, { method: 'PATCH', body: JSON.stringify({ status }) }));
}
