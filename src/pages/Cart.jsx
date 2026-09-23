import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import Icon from '../components/Icon.jsx';
import ProductImage from '../components/ProductImage.jsx';

export default function Cart() {
  const { cart, setItemQty, removeItem, removeBookedService, clearCart } = useCart();
  const { format } = useCurrency();
  const [checkedOut, setCheckedOut] = useState(false);

  // Cart lines carry their own product snapshot (see CartContext.addItem),
  // so they render correctly regardless of whether the product came from
  // the mock catalog or the live API. A line from an older cart saved
  // before that change won't have one — drop it rather than crash.
  const lineItems = cart.items.filter((item) => item.product);
  const productSubtotal = lineItems.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const serviceSubtotal = cart.services.reduce((sum, s) => sum + (s.price ?? 0), 0);
  const total = productSubtotal + serviceSubtotal;
  const isEmpty = lineItems.length === 0 && cart.services.length === 0;

  function handleCheckout() {
    // Prototype checkout: no payment processor is connected yet. This
    // confirms the order locally and clears the cart, so the flow feels
    // complete for demo purposes without pretending to charge a real card.
    setCheckedOut(true);
    clearCart();
  }

  if (checkedOut) {
    return (
      <section className="section container">
        <div className="card card-pad checkout-confirm">
          <span className="value-icon">
            <Icon name="jellyfish" size={48} />
          </span>
          <h1>Order placed!</h1>
          <p className="muted">
            This is a front-end prototype, so no payment was actually taken — but in a real build, this is where a
            confirmation email and order tracking would kick in.
          </p>
          <Link to="/shop" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </section>
    );
  }

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
            {lineItems.length > 0 && (
              <div className="card">
                <div className="card-pad cart-section-title">Products</div>
                {lineItems.map(({ product, qty, bundleLabel }) => (
                  <div key={product.id} className="cart-line">
                    <div className="cart-line-media">
                      <ProductImage product={product} aspect="1 / 1" />
                    </div>
                    <div className="cart-line-body">
                      <Link to={`/product/${product.id}`}>{product.name}</Link>
                      {bundleLabel && <span className="tag cart-bundle-tag">{bundleLabel}</span>}
                      <span className="muted">{format(product.price)} each</span>
                    </div>
                    <div className="qty-input">
                      <button aria-label="Decrease quantity" onClick={() => setItemQty(product.id, qty - 1)}>
                        −
                      </button>
                      <span>{qty}</span>
                      <button aria-label="Increase quantity" onClick={() => setItemQty(product.id, qty + 1)}>
                        +
                      </button>
                    </div>
                    <span className="price cart-line-total">{format(product.price * qty)}</span>
                    <button className="btn btn-ghost" onClick={() => removeItem(product.id)} aria-label={`Remove ${product.name}`}>
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {cart.services.length > 0 && (
              <div className="card">
                <div className="card-pad cart-section-title">Booked Services</div>
                {cart.services.map((service) => (
                  <div key={service.bookingId} className="cart-line">
                    <div className="cart-line-media cart-line-media-service">
                      <Icon name={service.icon ?? 'wrench'} size={20} />
                    </div>
                    <div className="cart-line-body">
                      <span>{service.name}</span>
                      <span className="muted">
                        {service.date} {service.time && `· ${service.time}`}
                      </span>
                    </div>
                    <span className="price cart-line-total">{format(service.price ?? 0)}</span>
                    <button className="btn btn-ghost" onClick={() => removeBookedService(service.bookingId)} aria-label={`Remove ${service.name}`}>
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="card card-pad cart-summary">
            <h3>Order Summary</h3>
            <div className="cart-summary-row">
              <span className="muted">Products</span>
              <span>{format(productSubtotal)}</span>
            </div>
            <div className="cart-summary-row">
              <span className="muted">Services</span>
              <span>{format(serviceSubtotal)}</span>
            </div>
            <hr className="divider" />
            <div className="cart-summary-row cart-summary-total">
              <span>Total</span>
              <span className="price">{format(total)}</span>
            </div>
            <button className="btn btn-primary btn-block" onClick={handleCheckout}>
              Checkout
            </button>
            <p className="muted cart-checkout-note">Prototype checkout — no payment is actually processed.</p>
          </aside>
        </div>
      )}
    </section>
  );
}
