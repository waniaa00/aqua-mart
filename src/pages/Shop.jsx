import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { fetchCategories, fetchProducts } from '../api/products.js';

// Debounces the search box so every keystroke doesn't fire a request —
// waits for a short pause in typing before hitting the API.
function useDebounced(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') ?? 'all';
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 300);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchProducts({
      search: debouncedQuery.trim() || undefined,
      category: activeCategory === 'all' ? undefined : activeCategory,
      limit: 100,
    })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.items);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategory, debouncedQuery]);

  function setCategory(slug) {
    if (slug === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    setSearchParams(searchParams);
  }

  const activeLabel = activeCategory === 'all' ? 'All Products' : categories.find((c) => c.slug === activeCategory)?.name ?? 'All Products';

  return (
    <section className="section">
      <div className="container shop-layout">
        <aside className="shop-sidebar">
          <div className="field">
            <label htmlFor="shop-search">Search</label>
            <input id="shop-search" className="input" placeholder="Search products…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          <button className={`shop-category-link ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setCategory('all')}>
            All Products
          </button>

          {categories.map((c) => (
            <button key={c.id} className={`shop-category-link ${activeCategory === c.slug ? 'active' : ''}`} onClick={() => setCategory(c.slug)}>
              {c.name}
            </button>
          ))}
        </aside>

        <div className="shop-main">
          <div className="section-head">
            <div>
              <span className="eyebrow">Shop</span>
              <h1 className="shop-heading">{activeLabel}</h1>
            </div>
            {status === 'ready' && (
              <span className="muted">
                {products.length} product{products.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {status === 'loading' && <p className="muted">Loading products…</p>}

          {status === 'error' && <p className="muted">Couldn't load products right now. Please try again shortly.</p>}

          {status === 'ready' &&
            (products.length === 0 ? (
              <p className="muted">No products match that search. Try a different term or category.</p>
            ) : (
              <div className="grid grid-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
