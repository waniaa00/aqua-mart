import { useCallback, useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard.jsx';
import Icon from '../components/Icon.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { fetchWishlist, removeFromWishlist } from '../api/wishlist.js';
import { fetchProductBySlug } from '../api/products.js';

// GET /wishlist only returns {product_id, name, slug, price} — thin
// compared to what ProductCard needs (availability, tagline, productId
// distinct from id, etc.). Resolving each item's full product detail via
// its slug (already fetched for /product/:slug pages) gives a real
// ProductCard-compatible object, and naturally surfaces the "unavailable"
// case (404) if the product was archived since being saved — FR-009's
// acceptance scenario 3, not a separate special case to build.
export default function DashboardWishlist() {
  const { token } = useCustomerAuth();
  const { currency } = useCurrency();
  const [entries, setEntries] = useState(null); // [{ item, product, unavailable }]
  const [status, setStatus] = useState('loading');

  const load = useCallback(() => {
    if (!token) return;
    setStatus('loading');
    fetchWishlist(token)
      .then(async (items) => {
        const resolved = await Promise.all(
          items.map(async (item) => {
            try {
              const product = await fetchProductBySlug(item.slug, currency);
              return { item, product, unavailable: false };
            } catch {
              return { item, product: null, unavailable: true };
            }
          })
        );
        setEntries(resolved);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [token, currency]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRemove(productId) {
    await removeFromWishlist(token, productId);
    setEntries((prev) => prev.filter((e) => e.item.product_id !== productId));
  }

  return (
    <section className="section" style={{ paddingTop: '2rem' }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1>Wishlist</h1>
        </div>
      </div>

      {status === 'loading' && <p className="muted">Loading your wishlist…</p>}
      {status === 'error' && <p className="muted">Couldn't load your wishlist right now.</p>}

      {status === 'ready' &&
        (entries.length === 0 ? (
          <div className="card card-pad">
            <p className="muted">Nothing saved yet.</p>
            <a className="btn btn-outline btn-sm" href="/shop">
              Browse the Shop
            </a>
          </div>
        ) : (
          <div className="grid grid-3">
            {entries.map(({ item, product, unavailable }) =>
              unavailable ? (
                <div key={item.product_id} className="card card-pad wishlist-unavailable">
                  <p style={{ fontWeight: 600 }}>{item.name}</p>
                  <p className="muted">No longer available</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(item.product_id)} aria-label={`Remove ${item.name}`}>
                    <Icon name="x" size={14} /> Remove
                  </button>
                </div>
              ) : (
                <div key={item.product_id} style={{ position: 'relative' }}>
                  <ProductCard product={product} />
                  <button
                    className="wishlist-remove-btn"
                    onClick={() => handleRemove(item.product_id)}
                    aria-label={`Remove ${item.name} from wishlist`}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              )
            )}
          </div>
        ))}
    </section>
  );
}
