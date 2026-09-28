import { useEffect, useRef, useState } from 'react';
import { fetchNotifications, fetchAdminNotifications } from '../api/notifications.js';

const POLL_MS = 60_000;

// FR-028 — periodic re-check for new notifications while the dashboard is
// open, paused when the tab isn't visible so it doesn't poll a backgrounded
// tab needlessly (research.md §7). Counts unread as `delivered_at == null`.
// Fetches one page (50) rather than a dedicated count endpoint — none
// exists — matching the same tradeoff already made for order/appointment
// counts on Dashboard.jsx at this app's scale.
export default function useNotificationPolling(token, role) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    const fetcher = role === 'admin' ? () => fetchAdminNotifications(token, { limit: 50 }) : () => fetchNotifications(token, { limit: 50 });

    function poll() {
      fetcher()
        .then((res) => {
          if (cancelled) return;
          setUnreadCount(res.items.filter((n) => !n.delivered_at).length);
        })
        .catch(() => {});
    }

    poll();

    function startInterval() {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(poll, POLL_MS);
    }
    function stopInterval() {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (document.visibilityState === 'visible') startInterval();
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        poll();
        startInterval();
      } else {
        stopInterval();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [token, role, refreshKey]);

  return { unreadCount, refresh: () => setRefreshKey((k) => k + 1) };
}
