import PhotoImage from './PhotoImage.jsx';
import PlaceholderArt from './PlaceholderArt.jsx';
import { CATEGORY_ICON } from '../data/products.js';
import { PRODUCT_TYPE_ICON } from '../api/adapters.js';

// Looks for /images/products/<product.id>.jpg and falls back to the icon
// placeholder art if it isn't there. One fixed extension (not a chain of
// jpg/png/webp attempts) keeps this to a single request per product - with
// 39 products, trying several extensions each would mean up to ~150 404s
// logged on the shop page alone whenever a photo is missing. Save photos as
// .jpg named after the product id and they just work, no code change needed.
//
// `product` may come from the mock catalog (data/products.js, keyed by
// `category`) or the live API (adapters.js, keyed by `productType`) — both
// icon maps are checked so either shape renders the right icon.
export default function ProductImage({ product, aspect = '4 / 3', placeholderNote }) {
  const icon = CATEGORY_ICON[product.category] ?? PRODUCT_TYPE_ICON[product.productType] ?? 'fish';
  return (
    <PhotoImage
      src={`/images/products/${product.id}.jpg`}
      alt={product.name}
      aspect={aspect}
      fallback={<PlaceholderArt icon={icon} gradient={product.gradient} aspect={aspect} />}
      note={placeholderNote}
    />
  );
}
