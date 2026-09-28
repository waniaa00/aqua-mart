import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useDashboardUI } from '../context/DashboardUIContext.jsx';

// Role-aware dashboard nav — persistent on desktop (collapsible), a
// Drawer-backed panel on mobile. `items` is passed by the layout so
// DashboardLayout stays role-agnostic. FR-001/FR-002.
export default function Sidebar({ items, mobileOpen, onCloseMobile }) {
  const { sidebarCollapsed, toggleSidebar } = useDashboardUI();

  const nav = (
    <nav className="dashboard-sidebar-nav" aria-label="Dashboard">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `dashboard-sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onCloseMobile}
        >
          <Icon name={item.icon} size={18} />
          <span className="dashboard-sidebar-link-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      <aside className={`dashboard-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <button
          className="dashboard-sidebar-collapse"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
        >
          <Icon name={sidebarCollapsed ? 'chevron-right' : 'chevron-left'} size={16} />
        </button>
        {nav}
      </aside>

      {mobileOpen && (
        <div className="dashboard-sidebar-mobile-overlay" onMouseDown={onCloseMobile}>
          <aside
            className="dashboard-sidebar-mobile-panel"
            onMouseDown={(e) => e.stopPropagation()}
            aria-label="Dashboard navigation"
          >
            <button className="btn btn-ghost btn-sm" onClick={onCloseMobile} aria-label="Close navigation">
              <Icon name="x" size={16} />
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
