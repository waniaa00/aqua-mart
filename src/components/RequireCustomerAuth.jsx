import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';

// Route guard for every /dashboard/* route — FR-035/FR-036 at the UI
// layer (the backend enforces the same thing independently on every
// request; this only decides what renders).
export default function RequireCustomerAuth() {
  const { isAuthenticated, ready } = useCustomerAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="container section">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/account/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
