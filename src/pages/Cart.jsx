import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAddresses } from '../api/account.js';
import { checkout as checkoutRequest } from '../api/orders.js';
import { useCart } from '../context/CartContext.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import Icon from '../components/Icon.jsx';

function money(m) {
  return Number(m.base_price);
}

export default function Cart() {
  const { isAuthenticated, token } = useCustomerAuth();
  const { cart, loading, error, updateItem, removeItem, applyCoupon, removeCoupon, refresh } = useCart();
  const { format } = useCurrency();

  const [addresses, setAddresses] = useState(null);
  const [addressId, setAddressId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [rowError, setRowError] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetchAddresses(token).then((list) => {
      setAddresses(list);
      const defaultAddr = list.find((a) => a.is_default) ?? list[0];
      if (defaultAddr) setAddressId(defaultAddr.id);
    });
  }, [token]);

  if (!isAuthenticated) {
    return (
      <section className="section container">
        <h1>Your Cart</h1>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <p className="muted">Log in to view your cart.</p>
          <Link to="/account/login" state={{ from: '/cart' }} className="btn btn-primary">
            Log In
          </Link>
        </div>
      </section>
    );
  }

  async function handleQuantityChange(productId, quantity) {
    setRowError(null);
    if (quantity < 1) return;
    try {
      await updateItem(productId, quantity);
    } catch (err) {
      setRowError(err.message ?? 'Could not update that item.');
    }
  }

  async function handleRemove(productId) {
    setRowError(null);
    try {
      await removeItem(productId);
    } catch (err) {
      setRowError(err.message ?? 'Could not remove that item.');
    }
  }

  async function handleApplyCoupon(e) {
    e.preventDefault();
    setCouponError(null);
    try {
      await applyCoupon(couponCode);
      setCouponCode('');
    } catch (err) {
      setCouponError(err.message ?? 'That coupon could not be applied.');
    }
  }

  async function handleRemoveCoupon() {
    setCouponError(null);
    try {
      await removeCoupon();
    } catch (err) {
      setCouponError(err.message ?? 'Could not remove that coupon.');
    }
  }

  async function handleCheckout() {
    setCheckoutError(null);
    if (!addressId) {
      setCheckoutError('Please add a delivery address before checking out.');
      return;
    }
    setCheckingOut(true);
    try {
      const order = await checkoutRequest(token, addressId);
      setConfirmedOrder(order);
      await refresh();
    } catch (err) {
      setCheckoutError(err.message ?? 'Checkout failed. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  }

  if (confirmedOrder) {
    return (
      <section className="section container">
        <div className="card card-pad checkout-confirm">
          <span className="value-icon">
            <Icon name="jellyfish" size={48} />
          </span>
          <h1>Order placed!</h1>
          <p className="muted">
            Order #{confirmedOrder.id.slice(0, 8)} has been created and is <strong>{confirmedOrder.status}</strong>.
            No payment has been charged — that integration isn't connected yet.
          </p>
          <p className="price">{format(money(confirmedOrder.total))}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link to="/account" className="btn btn-outline">
              View Order History
            </Link>
            <Link to="/shop" className="btn btn-primary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (loading && !cart) {
    return (
      <section className="section container">
        <h1>Your Cart</h1>
        <p className="muted">Loading…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section container">
        <h1>Your Cart</h1>
        <p className="muted">Could not load your cart.</p>
        <button className="btn btn-outline" onClick={refresh}>
          Try Again
        </button>
      </section>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <section className="section container">
      <h1>Your Cart</h1>

      {isEmpty ? (
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <p className="muted">Your cart is empty.</p>
          <Link to="/shop" className="btn btn-primary">
            Browse the Shop
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-lines">
            <div className="card">
              <div className="card-pad cart-section-title">Products</div>
              {cart.items.map((item) => (
                <div key={item.product_id} className="cart-line">
                  <div className="cart-line-body">
                    <span>{item.product_name}</span>
                    <span className="muted">{format(money(item.unit_price))} each</span>
                  </div>
                  <div className="qty-input">
                    <button
                      aria-label={item.quantity === 1 ? `Remove ${item.product_name}` : 'Decrease quantity'}
                      onClick={() =>
                        item.quantity === 1 ? handleRemove(item.product_id) : handleQuantityChange(item.product_id, item.quantity - 1)
                      }
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button aria-label="Increase quantity" onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}>
                      +
                    </button>
                  </div>
                  <span className="price cart-line-total">{format(money(item.line_total))}</span>
                  <button className="btn btn-ghost" onClick={() => handleRemove(item.product_id)} aria-label={`Remove ${item.product_name}`}>
                    <Icon name="x" size={16} />
                  </button>
                </div>
              ))}
              {rowError && (
                <p className="card-pad" role="alert" style={{ color: 'var(--danger)', margin: 0 }}>
                  {rowError}
                </p>
              )}
            </div>
          </div>

          <aside className="card card-pad cart-summary">
            <h3>Order Summary</h3>

            <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                className="input"
                placeholder="Coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                aria-label="Coupon code"
              />
              <button className="btn btn-outline" type="submit" disabled={!couponCode}>
                Apply
              </button>
            </form>
            {couponError && (
              <p role="alert" style={{ color: 'var(--danger)' }}>
                {couponError}
              </p>
            )}
            {cart.coupon_code && (
              <div className="cart-summary-row">
                <span className="muted">Coupon: {cart.coupon_code}</span>
                <button className="btn btn-ghost" onClick={handleRemoveCoupon}>
                  Remove
                </button>
              </div>
            )}

            <div className="cart-summary-row">
              <span className="muted">Subtotal</span>
              <span>{format(money(cart.subtotal))}</span>
            </div>
            <div className="cart-summary-row">
              <span className="muted">Discount</span>
              <span>-{format(money(cart.discount_amount))}</span>
            </div>
            <hr className="divider" />
            <div className="cart-summary-row cart-summary-total">
              <span>Total</span>
              <span className="price">{format(money(cart.total))}</span>
            </div>

            <div className="field" style={{ marginTop: '1rem' }}>
              <label htmlFor="checkout-address">Delivery address</label>
              {addresses && addresses.length > 0 ? (
                <select id="checkout-address" className="input" value={addressId} onChange={(e) => setAddressId(e.target.value)}>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name} — {a.address_line}, {a.city}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="muted">
                  You have no saved addresses. <Link to="/account">Add one</Link> before checking out.
                </p>
              )}
            </div>

            {checkoutError && (
              <p role="alert" style={{ color: 'var(--danger)' }}>
                {checkoutError}
              </p>
            )}

            <button className="btn btn-primary btn-block" onClick={handleCheckout} disabled={checkingOut || !addressId}>
              {checkingOut ? 'Placing order…' : 'Checkout'}
            </button>
            <p className="muted cart-checkout-note">This creates a real order. No payment is charged yet.</p>
          </aside>
        </div>
      )}
    </section>
  );
}
