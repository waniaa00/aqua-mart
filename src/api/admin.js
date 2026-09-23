import { apiFetch } from './client.js';

export function fetchDashboardSummary(token) {
  return apiFetch('/admin/dashboard/summary', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
