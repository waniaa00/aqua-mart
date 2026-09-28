import { useState } from 'react';
import Icon from './Icon.jsx';
import CurrencySelector from './CurrencySelector.jsx';
import NotificationPanel from './NotificationPanel.jsx';
import GlobalSearch from './GlobalSearch.jsx';
import useNotificationPolling from '../hooks/useNotificationPolling.js';

// Shared header for both dashboard shells — FR-003. Search and
// notifications are both fully wired (US9, US6).
export default function DashboardHeader({ role, token, userLabel, onLogout, onOpenMobileNav }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const { unreadCount, refresh } = useNotificationPolling(token, role);

  return (
    <header className="dashboard-header">
      <button
        className="dashboard-header-menu-toggle"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Icon name="menu" size={20} />
      </button>

      <GlobalSearch role={role} token={token} />

      <div className="dashboard-header-actions">
        <CurrencySelector />

        <div className="dashboard-header-notifications">
          <button className="btn btn-ghost btn-sm" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`} onClick={() => setPanelOpen(true)}>
            <Icon name="bell" size={18} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
        </div>

        <div className="dashboard-header-user">
          <Icon name="user" size={18} />
          <span>{userLabel}</span>
          <button className="btn btn-outline btn-sm" onClick={onLogout}>
            Log Out
          </button>
        </div>
      </div>

      <NotificationPanel role={role} token={token} open={panelOpen} onClose={() => setPanelOpen(false)} onChanged={refresh} />
    </header>
  );
}
