import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// A single cart holding both product line items (id + qty) and booked
// services (each its own line, since a service booking carries its own date
// / time / address rather than a quantity). Persisted to localStorage so a
// refresh doesn't lose the cart - this is a front-end prototype with no
// backend, so localStorage is the only persistence available.

const STORAGE_KEY = 'aqua-mart-cart-v1';
const CartContext = createContext(null);

function loadInitialCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], services: [] };
    const parsed = JSON.parse(raw);
    return { items: parsed.items ?? [], services: parsed.services ?? [] };
  } catch {
    // corrupt or inaccessible storage (private browsing, quota, bad JSON) -
    // fall back to an empty cart rather than breaking the page
    return { items: [], services: [] };
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadInitialCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore - storage may be full or unavailable; the cart still works
      // for the rest of this session, it just won't persist across reloads
    }
  }, [cart]);

  const api = useMemo(
    () => ({
      cart,

      addItem(product, qty = 1) {
        setCart((prev) => {
          const existing = prev.items.find((i) => i.id === product.id);
          const items = existing
            ? prev.items.map((i) => (i.id === product.id ? { ...i, qty: i.qty + qty } : i))
            : [...prev.items, { id: product.id, qty, product }];
          return { ...prev, items };
        });
      },

      removeItem(id) {
        setCart((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
      },

      setItemQty(id, qty) {
        setCart((prev) => ({
          ...prev,
          items: qty <= 0 ? prev.items.filter((i) => i.id !== id) : prev.items.map((i) => (i.id === id ? { ...i, qty } : i)),
        }));
      },

      addBookedService(booking) {
        setCart((prev) => ({ ...prev, services: [...prev.services, { ...booking, bookingId: crypto.randomUUID() }] }));
      },

      removeBookedService(bookingId) {
        setCart((prev) => ({ ...prev, services: prev.services.filter((s) => s.bookingId !== bookingId) }));
      },

      addAquariumSetup(setup) {
        setCart((prev) => ({
          ...prev,
          items: [
            ...prev.items,
            ...setup.lines.map((line) => ({ id: line.id, qty: line.qty, product: line.product, bundleLabel: setup.label })),
          ],
        }));
      },

      clearCart() {
        setCart({ items: [], services: [] });
      },

      itemCount: cart.items.reduce((sum, i) => sum + i.qty, 0) + cart.services.length,
    }),
    [cart]
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
