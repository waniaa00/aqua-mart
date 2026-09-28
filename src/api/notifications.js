import { apiFetch } from './client.js';

function authed(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } };
}

export function fetchNotifications(token, { page = 1, limit = 20 } = {}) {
  return apiFetch('/notifications', authed(token, { params: { page, limit } }));
}

export function markNotificationRead(token, id) {
  return apiFetch(`/notifications/${id}/read`, authed(token, { method: 'POST' }));
}

// Admin notifications are broadcast (recipient_user_id is null — shared
// across all admins) — there's no per-admin mark-read endpoint, so this
// feed is read-only (see app/services/notification_service.py).
export function fetchAdminNotifications(token, { eventType, page = 1, limit = 20 } = {}) {
  return apiFetch('/admin/notifications', authed(token, { params: { event_type: eventType, page, limit } }));
}
