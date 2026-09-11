import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProductImage from '../components/ProductImage.jsx';
import ProductCard from '../components/ProductCard.jsx';
import Icon from '../components/Icon.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { getProductById, PRODUCTS, CATEGORIES } from '../data/products.js';

const AVAILABILITY_BADGE = {
  'In Stock': 'badge-success',
  'Low Stock': 'badge-coral',
  'Pre-order': 'badge',
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { format } = useCurrency();
  const product = getProductById(id);
  const [qty, setQty] = useState(1);
  const [reserved, setReserved] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  if (!product) {
    return (
      <section className="section container">
        <h1>Product not found</h1>
        <p className="muted">That listing may have sold out or moved.</p>
        <Link to="/shop" className="btn btn-outline">
          Back to Shop
        </Link>
      </section>
    );
  }

  const category = CATEGORIES.find((c) => c.id === product.category);
  const related = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);

  function handleAddToCart() {
    addItem(product, qty);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  }

  function handleScheduleDelivery() {
    navigate('/services/fish-delivery', { state: { productName: product.name } });
  }

  return (
    <section className="section">
      <div className="container">
        <nav className="breadcrumbs muted">
          <Link to="/shop">Shop</Link> / <Link to={`/shop?category=${product.category}`}>{category?.label}</Link> / {product.name}
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
              <button className="btn btn-primary" onClick={handleAddToCart}>
                {justAdded ? (
                  <>
                    Added <Icon name="check" size={16} />
                  </>
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
