import { createContext, useContext, useMemo, useState } from 'react';

// Session-only dashboard UI state (sidebar collapsed/expanded) — FR-002
// requires it to persist for "the remainder of the browser session," not
// across sessions, so plain component state is enough; no localStorage.
const DashboardUIContext = createContext(null);

export function DashboardUIProvider({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const api = useMemo(
    () => ({
      sidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed((v) => !v),
      mobileNavOpen,
      openMobileNav: () => setMobileNavOpen(true),
      closeMobileNav: () => setMobileNavOpen(false),
    }),
    [sidebarCollapsed, mobileNavOpen]
  );

  return <DashboardUIContext.Provider value={api}>{children}</DashboardUIContext.Provider>;
}

export function useDashboardUI() {
  const ctx = useContext(DashboardUIContext);
  if (!ctx) throw new Error('useDashboardUI must be used within a DashboardUIProvider');
  return ctx;
}
