import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import Icon from './Icon.jsx';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { isAuthenticated } = useCustomerAuth();
  const { format } = useCurrency();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  async function handleAddToCart() {
    if (!isAuthenticated) {
      navigate('/account/login', { state: { from: '/shop' } });
      return;
    }
    if (!product.productId) return; // mock-catalog product, not in the real backend
    setAdding(true);
    try {
      await addItem(product.productId);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="card product-card">
      <Link to={`/product/${product.id}`} className="product-card-media">
        <ProductImage product={product} />
        {product.availability === 'Low Stock' && <span className="badge badge-coral product-card-flag">Low Stock</span>}
      </Link>
      <div className="card-pad product-card-body">
        {product.badges?.[0] && <span className="badge">{product.badges[0]}</span>}
        <h3 className="product-card-name">
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <p className="product-card-tagline">{product.tagline}</p>
        <div className="product-card-footer">
          <span className="price">{format(product.price)}</span>
          <button className="btn btn-outline btn-sm" onClick={handleAddToCart} disabled={adding}>
            {justAdded ? (
              <>
                Added <Icon name="check" size={14} />
              </>
            ) : adding ? (
              'Adding…'
            ) : (
              'Add to Cart'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
