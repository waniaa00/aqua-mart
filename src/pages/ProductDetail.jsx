import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProductImage from '../components/ProductImage.jsx';
import ProductCard from '../components/ProductCard.jsx';
import Icon from '../components/Icon.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { fetchProductBySlug, fetchProducts } from '../api/products.js';

const AVAILABILITY_BADGE = {
  'In Stock': 'badge-success',
  'Low Stock': 'badge-coral',
  'Pre-order': 'badge',
};

export default function ProductDetail() {
  const { id: slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isAuthenticated } = useCustomerAuth();
  const { format, currency } = useCurrency();
  const [adding, setAdding] = useState(false);

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'not-found' | 'error'
  const [qty, setQty] = useState(1);
  const [reserved, setReserved] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setProduct(null);
    setRelated([]);
    setQty(1);
    setReserved(false);

    fetchProductBySlug(slug, currency)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        setStatus('ready');
        if (p.category) {
          fetchProducts({ category: p.category, limit: 4, currency })
            .then((res) => {
              if (!cancelled) setRelated(res.items.filter((item) => item.id !== p.id).slice(0, 3));
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(err?.status === 404 ? 'not-found' : 'error');
      });

    return () => {
      cancelled = true;
    };
  }, [slug, currency]);

  if (status === 'loading') {
    return (
      <section className="section container">
        <p className="muted">Loading product…</p>
      </section>
    );
  }

  if (status !== 'ready') {
    return (
      <section className="section container">
        <h1>{status === 'not-found' ? 'Product not found' : "Couldn't load this product"}</h1>
        <p className="muted">
          {status === 'not-found' ? 'That listing may have sold out or moved.' : 'Please try again shortly.'}
        </p>
        <Link to="/shop" className="btn btn-outline">
          Back to Shop
        </Link>
      </section>
    );
  }

  async function handleAddToCart() {
    if (!isAuthenticated) {
      navigate('/account/login', { state: { from: `/product/${slug}` } });
      return;
    }
    if (!product.productId) return; // mock-catalog product, not in the real backend
    setAdding(true);
    try {
      await addItem(product.productId, qty);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } finally {
      setAdding(false);
    }
  }

  function handleScheduleDelivery() {
    navigate('/services/fish-delivery', { state: { productName: product.name } });
  }

  return (
    <section className="section">
      <div className="container">
        <nav className="breadcrumbs muted">
          <Link to="/shop">Shop</Link>
          {product.category && (
            <>
              {' '}
              / <Link to={`/shop?category=${product.category}`}>{product.categoryLabel}</Link>
            </>
          )}{' '}
          / {product.name}
        </nav>

        <div className="product-detail">
          <div>
            <ProductImage
              key={product.id}
              product={product}
              aspect="1 / 1"
              placeholderNote={
                <p className="muted product-media-note">
                  <Icon name="fish" size={14} /> Placeholder visual — swap for real live photo/video
                </p>
              }
            />
          </div>

          <div>
            {product.badges?.map((b) => (
              <span key={b} className="badge" style={{ marginRight: '0.4rem' }}>
                {b}
              </span>
            ))}
            <h1 className="product-title">{product.name}</h1>
            <p className="lede">{product.description}</p>

            <div className="product-price-row">
              <span className="product-price">{format(product.price)}</span>
              <span className={`badge ${AVAILABILITY_BADGE[product.availability] ?? 'badge'}`}>{product.availability}</span>
            </div>

            <div className="product-actions">
              <div className="qty-input">
                <button aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  −
                </button>
                <span>{qty}</span>
                <button aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)}>
                  +
                </button>
              </div>
              <button className="btn btn-primary" onClick={handleAddToCart} disabled={adding}>
                {justAdded ? (
                  <>
                    Added <Icon name="check" size={16} />
                  </>
                ) : adding ? (
                  'Adding…'
                ) : (
                  'Add to Cart'
                )}
              </button>
              {product.reservable && (
                <button className="btn btn-outline" disabled={reserved} onClick={() => setReserved(true)}>
                  {reserved ? (
                    <>
                      Reserved <Icon name="check" size={16} />
                    </>
                  ) : (
                    'Reserve Fish'
                  )}
                </button>
              )}
              {product.deliveryEligible && (
                <button className="btn btn-outline" onClick={handleScheduleDelivery}>
                  Schedule Delivery
                </button>
              )}
            </div>
            {reserved && (
              <p className="muted product-reserve-note">
                Reserved — we'll hold this for 48 hours. Visit the shop or call to complete your purchase.
              </p>
            )}

            <hr className="divider" />

            <h3>Details</h3>
            <table className="spec-table">
              <tbody>
                {Object.entries(product.specs).map(([key, value]) => (
                  <tr key={key}>
                    <th>{key}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {related.length > 0 && (
          <div className="section">
            <div className="section-head">
              <h2>You might also like</h2>
            </div>
            <div className="grid grid-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
