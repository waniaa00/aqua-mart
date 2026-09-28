import { apiFetch } from './client.js';

export function fetchAnalytics(token, { range, start, end, compare } = {}) {
  return apiFetch('/admin/dashboard/analytics', {
    headers: { Authorization: `Bearer ${token}` },
    params: { range, start, end, compare },
  });
}
