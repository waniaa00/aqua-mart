import { createContext, useContext, useMemo, useState } from 'react';
import { login as loginRequest } from '../api/auth.js';

// Admin-only session, separate from any future customer auth. Holds just
// the JWT the backend issues — role/expiry enforcement happens server-side
// on every admin request; this only decides whether the UI shows the
// login form or the dashboard.
const TOKEN_STORAGE_KEY = 'aqua-mart-admin-token-v1';
const AdminAuthContext = createContext(null);

function isExpired(token) {
  try {
    const [, payload] = token.split('.');
    const { exp } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return !exp || Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}

function loadStoredToken() {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    return token && !isExpired(token) ? token : null;
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(loadStoredToken);

  const api = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),

      async login(email, password) {
        const newToken = await loginRequest(email, password);
        try {
          localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
        } catch {
          // ignore — session still works for the rest of this tab
        }
        setToken(newToken);
      },

      logout() {
        try {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch {
          // ignore
        }
        setToken(null);
      },
    }),
    [token]
  );

  return <AdminAuthContext.Provider value={api}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
}
