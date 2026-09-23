import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as cartApi from '../api/cart.js';
import { useCustomerAuth } from './CustomerAuthContext.jsx';

// Server-owned cart: the backend requires a logged-in customer for every
// cart operation (no guest cart), so this context holds only the backend's
// last CartResponse — no localStorage, no client-computed totals. `cart` is
// null whenever there's no authenticated session.
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated, token, ready } = useCustomerAuth();
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
      const result = await cartApi.getCart(token);
      if (requestId === requestIdRef.current) setCart(result);
    } catch (err) {
      if (requestId === requestIdRef.current) setError(err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!ready) return;
    if (token) {
      refresh();
    } else {
      requestIdRef.current += 1; // invalidate any in-flight request from the previous session
      setCart(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, ready]);

  async function addItem(productId, quantity = 1) {
    const result = await cartApi.addItem(token, productId, quantity);
    requestIdRef.current += 1;
    setCart(result);
    return result;
  }

  async function updateItem(productId, quantity) {
    const result = await cartApi.updateItem(token, productId, quantity);
    requestIdRef.current += 1;
    setCart(result);
    return result;
  }

  async function removeItem(productId) {
    const result = await cartApi.removeItem(token, productId);
    requestIdRef.current += 1;
    setCart(result);
    return result;
  }

  async function applyCoupon(code) {
    const result = await cartApi.applyCoupon(token, code);
    requestIdRef.current += 1;
    setCart(result);
    return result;
  }

  async function removeCoupon() {
    const result = await cartApi.removeCoupon(token);
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
    [cart, loading, error, isAuthenticated, refresh, token]
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
