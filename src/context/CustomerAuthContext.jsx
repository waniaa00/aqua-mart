import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginRequest, register as registerRequest } from '../api/auth.js';
import { fetchProfile } from '../api/account.js';
import { isTokenExpired } from '../utils/jwt.js';

// Customer session, separate from the admin session (AdminAuthContext).
// Holds the JWT plus the profile it belongs to (name/email for the header,
// preferred currency) — role/permission enforcement still happens
// server-side on every request.
const TOKEN_STORAGE_KEY = 'aqua-mart-customer-token-v1';
const CustomerAuthContext = createContext(null);

function loadStoredToken() {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    return token && !isTokenExpired(token) ? token : null;
  } catch {
    return null;
  }
}

function persistToken(token) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore — session still works for the rest of this tab
  }
}

export function CustomerAuthProvider({ children }) {
  const [token, setToken] = useState(loadStoredToken);
  const [user, setUser] = useState(null);
  // Starts false whenever there's a stored token, so header/route guards can
  // wait for the profile fetch instead of flashing a logged-out state.
  const [ready, setReady] = useState(() => !loadStoredToken());

  useEffect(() => {
    if (!token) {
      setUser(null);
      setReady(true);
      return;
    }
    let cancelled = false;
    fetchProfile(token)
      .then((profile) => {
        if (!cancelled) setUser(profile);
      })
      .catch(() => {
        if (!cancelled) {
          try {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          } catch {
            // ignore
          }
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const api = useMemo(
    () => ({
      token,
      user,
      ready,
      isAuthenticated: Boolean(token),

      async login(email, password) {
        const newToken = await loginRequest(email, password);
        persistToken(newToken);
        setToken(newToken);
      },

      async register(name, email, password) {
        await registerRequest(name, email, password);
        const newToken = await loginRequest(email, password);
        persistToken(newToken);
        setToken(newToken);
      },

      logout() {
        try {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch {
          // ignore
        }
        setToken(null);
        setUser(null);
      },

      // Lets Account.jsx reflect a profile edit immediately without a refetch.
      updateUser(patch) {
        setUser((prev) => (prev ? { ...prev, ...patch } : prev));
      },
    }),
    [token, user, ready]
  );

  return <CustomerAuthContext.Provider value={api}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  return ctx;
}
