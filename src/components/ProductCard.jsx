import { Link } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { format } = useCurrency();

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
          <button className="btn btn-outline btn-sm" onClick={() => addItem(product)}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
