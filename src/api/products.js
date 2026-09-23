import { apiFetch } from './client.js';
import { adaptProductDetail, adaptProductListItem } from './adapters.js';

let categoriesPromise = null;

// Categories rarely change within a session — fetch once and share the
// result (and the id -> record map products are adapted against).
export function fetchCategories() {
  if (!categoriesPromise) {
    categoriesPromise = apiFetch('/categories').catch((err) => {
      categoriesPromise = null; // allow retry on next call
      throw err;
    });
  }
  return categoriesPromise;
}

async function categoriesById() {
  const categories = await fetchCategories();
  return new Map(categories.map((c) => [c.id, c]));
}

export async function fetchProducts({ search, category, page = 1, limit = 20 } = {}) {
  const [response, byId] = await Promise.all([
    apiFetch('/products', { params: { search, category, page, limit } }),
    categoriesById(),
  ]);
  return {
    items: response.items.map((p) => adaptProductListItem(p, byId)),
    page: response.page,
    totalPages: response.total_pages,
    totalItems: response.total_items,
  };
}

export async function fetchProductBySlug(slug) {
  const [product, byId] = await Promise.all([apiFetch(`/products/${slug}`), categoriesById()]);
  return adaptProductDetail(product, byId);
}
