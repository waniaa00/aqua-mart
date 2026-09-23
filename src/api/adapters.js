// Maps live API records onto the plain shapes the UI components were built
// against (originally hand-authored in data/products.js / data/services.js).
// Keeping the adaptation here means ProductCard, ProductImage, etc. don't
// need to know whether a product came from the mock catalog or the API.

export const PRODUCT_TYPE_ICON = {
  fish: 'fish',
  invert: 'shrimp',
  plant: 'leaf',
  equipment: 'wrench',
  supply: 'droplet',
  decor: 'decor',
  substrate: 'rock',
  medication: 'pill',
};

// A small fixed palette so live products still get varied placeholder art
// instead of every card looking identical — picked deterministically from
// the product id so the same product always gets the same look.
const GRADIENT_PALETTE = [
  ['#e8862c', '#3a1f0c'],
  ['#2a5fd6', '#0a1230'],
  ['#22b7d6', '#0a1a2a'],
  ['#f4d229', '#2a2205'],
  ['#d6412c', '#240a06'],
  ['#2f7a3c', '#08150a'],
  ['#2a4a6a', '#0a1420'],
  ['#e14fae', '#2a0e2c'],
];

function gradientFor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENT_PALETTE[hash % GRADIENT_PALETTE.length];
}

function availabilityFor(stockQuantity) {
  if (stockQuantity <= 0) return 'Out of Stock';
  if (stockQuantity <= 5) return 'Low Stock';
  return 'In Stock';
}

function specsFor(product) {
  const fish = product.fish_details;
  if (fish) {
    return Object.fromEntries(
      Object.entries({
        Species: fish.common_name ?? fish.species,
        Size: fish.size,
        Temperament: fish.temperament,
        Difficulty: fish.difficulty,
        'Min. Tank Size': fish.min_tank_size_liters ? `${fish.min_tank_size_liters} L` : null,
        Diet: fish.diet,
      }).filter(([, value]) => Boolean(value))
    );
  }
  return { SKU: product.sku, Type: product.product_type };
}

// `categoriesById` is a Map of category id -> CategoryResponse, from
// fetchCategories(). Used to attach the category's slug for filtering/links.
export function adaptProductListItem(product, categoriesById) {
  const category = categoriesById?.get(product.category_id);
  return {
    id: product.slug,
    productId: product.id,
    name: product.name,
    tagline: product.short_description,
    category: category?.slug ?? null,
    categoryLabel: category?.name ?? null,
    productType: product.product_type,
    price: Number(product.price.base_price),
    badges: product.is_featured ? ['Featured'] : [],
    gradient: gradientFor(product.id),
    reservable: product.product_type === 'fish',
    deliveryEligible: product.product_type === 'fish',
    averageRating: product.average_rating,
    reviewCount: product.review_count,
  };
}

export function adaptProductDetail(product, categoriesById) {
  return {
    ...adaptProductListItem(product, categoriesById),
    description: product.description,
    specs: specsFor(product),
    availability: availabilityFor(product.stock_quantity),
    images: product.images,
  };
}

const SERVICE_META_BY_TYPE = {
  setup: { icon: 'home', flow: 'aquarium-setup', location: 'home-visit', badge: 'Most Popular' },
  consultation: { icon: 'message-circle', flow: 'generic', location: 'in-store-or-call' },
  cleaning: { icon: 'broom', flow: 'generic', location: 'home-visit' },
  maintenance: { icon: 'wrench', flow: 'generic', location: 'home-visit', priceNote: 'per visit' },
  delivery: { icon: 'truck', flow: 'generic', location: 'delivery' },
};
const DEFAULT_SERVICE_META = { icon: 'wrench', flow: 'generic', location: 'in-store-or-call' };

export function adaptService(service) {
  const meta = SERVICE_META_BY_TYPE[service.service_type] ?? DEFAULT_SERVICE_META;
  return {
    id: service.id,
    icon: meta.icon,
    name: service.name,
    summary: service.description,
    duration: service.duration_minutes >= 60 ? `${Math.round(service.duration_minutes / 60)} hr` : `${service.duration_minutes} min`,
    price: Number(service.price.base_price),
    priceNote: meta.priceNote,
    flow: meta.flow,
    location: meta.location,
    badge: meta.badge,
  };
}
