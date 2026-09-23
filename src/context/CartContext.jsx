import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as cartApi from '../api/cart.js';
import { useCustomerAuth } from './CustomerAuthContext.jsx';
import { useCurrency } from './CurrencyContext.jsx';

// Server-owned cart: the backend requires a logged-in customer for every
// cart operation (no guest cart), so this context holds only the backend's
// last CartResponse — no localStorage, no client-computed totals. `cart` is
// null whenever there's no authenticated session. Every call passes the
// selected currency so the backend returns already-converted amounts.
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated, token, ready } = useCustomerAuth();
  const { currency } = useCurrency();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Guards against a stale in-flight request landing after a newer one.
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!token) {
      setCart(null);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await cartApi.getCart(token, currency);
      if (requestId === requestIdRef.current) setCart(result);
    } catch (err) {
      if (requestId === requestIdRef.current) setError(err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [token, currency]);

  useEffect(() => {
    if (!ready) return;
    if (token) {
      refresh();
    } else {
      requestIdRef.current += 1; // invalidate any in-flight request from the previous session
      setCart(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, ready, currency]);

  async function addItem(productId, quantity = 1) {
    const result = await cartApi.addItem(token, productId, quantity, currency);
    requestIdRef.current += 1;
    setCart(result);
    return result;
  }

  async function updateItem(productId, quantity) {
    const result = await cartApi.updateItem(token, productId, quantity, currency);
    requestIdRef.current += 1;
    setCart(result);
    return result;
  }

  async function removeItem(productId) {
    const result = await cartApi.removeItem(token, productId, currency);
    requestIdRef.current += 1;
    setCart(result);
    return result;
  }

  async function applyCoupon(code) {
    const result = await cartApi.applyCoupon(token, code, currency);
    requestIdRef.current += 1;
    setCart(result);
    return result;
  }

  async function removeCoupon() {
    const result = await cartApi.removeCoupon(token, currency);
    requestIdRef.current += 1;
    setCart(result);
    return result;
  }

  const api = useMemo(
    () => ({
      cart,
      loading,
      error,
      isAuthenticated,
      itemCount: cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0,
      refresh,
      addItem,
      updateItem,
      removeItem,
      applyCoupon,
      removeCoupon,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, loading, error, isAuthenticated, refresh, token, currency]
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
