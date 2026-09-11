import PhotoImage from './PhotoImage.jsx';
import PlaceholderArt from './PlaceholderArt.jsx';
import { CATEGORY_ICON } from '../data/products.js';

// Looks for /images/products/<product.id>.jpg and falls back to the icon
// placeholder art if it isn't there. One fixed extension (not a chain of
// jpg/png/webp attempts) keeps this to a single request per product - with
// 39 products, trying several extensions each would mean up to ~150 404s
// logged on the shop page alone whenever a photo is missing. Save photos as
// .jpg named after the product id and they just work, no code change needed.
export default function ProductImage({ product, aspect = '4 / 3', placeholderNote }) {
  return (
    <PhotoImage
      src={`/images/products/${product.id}.jpg`}
      alt={product.name}
      aspect={aspect}
      fallback={<PlaceholderArt icon={CATEGORY_ICON[product.category]} gradient={product.gradient} aspect={aspect} />}
      note={placeholderNote}
    />
  );
}
