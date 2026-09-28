import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

// Route guard for every /admin/* route (except /admin/login) — same
// pattern as RequireCustomerAuth. Supersedes AdminDashboard.jsx's own
// inline check, which is removed once this wraps the route (US2, T023).
export default function RequireAdminAuth() {
  const { isAuthenticated } = useAdminAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
