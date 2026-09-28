import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import DashboardHeader from './DashboardHeader.jsx';
import { useDashboardUI } from '../context/DashboardUIContext.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

const CUSTOMER_NAV = [
  { to: '/dashboard', label: 'Overview', icon: 'grid', end: true },
  { to: '/dashboard/wishlist', label: 'Wishlist', icon: 'heart' },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: 'grid', end: true },
  { to: '/admin/orders', label: 'Orders', icon: 'package' },
  { to: '/admin/inventory', label: 'Inventory', icon: 'sliders' },
  { to: '/admin/analytics', label: 'Analytics', icon: 'trending-up' },
  { to: '/admin/appointments', label: 'Appointments', icon: 'calendar' },
  { to: '/admin/customers', label: 'Customers', icon: 'user' },
  { to: '/admin/reviews', label: 'Reviews', icon: 'message-circle' },
  { to: '/admin/promotions', label: 'Promotions', icon: 'tag' },
  { to: '/admin/products', label: 'Products', icon: 'fish' },
  { to: '/admin/categories', label: 'Categories', icon: 'store' },
  { to: '/admin/services', label: 'Services', icon: 'wrench' },
];

// Shared shell for both /dashboard/* and /admin/* — composes Sidebar +
// DashboardHeader + the routed page. Both auth contexts are mounted
// globally (main.jsx), so reading both here and picking by `role` is
// always safe, unlike branching which hook gets called.
export default function DashboardLayout({ role }) {
  const { mobileNavOpen, openMobileNav, closeMobileNav } = useDashboardUI();
  const customerAuth = useCustomerAuth();
  const adminAuth = useAdminAuth();

  const isAdmin = role === 'admin';
  const items = isAdmin ? ADMIN_NAV : CUSTOMER_NAV;
  const userLabel = isAdmin ? 'Admin' : customerAuth.user?.name?.split(' ')[0] ?? 'Account';
  const onLogout = isAdmin ? adminAuth.logout : customerAuth.logout;
  const token = isAdmin ? adminAuth.token : customerAuth.token;

  return (
    <div className="dashboard-shell">
      <Sidebar items={items} mobileOpen={mobileNavOpen} onCloseMobile={closeMobileNav} />
      <div className="dashboard-shell-main">
        <DashboardHeader role={role} token={token} userLabel={userLabel} onLogout={onLogout} onOpenMobileNav={openMobileNav} />
        <div className="dashboard-shell-content container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
