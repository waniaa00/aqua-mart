import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { PRODUCTS, CATEGORIES } from '../data/products.js';

const GROUPS = [...new Set(CATEGORIES.map((c) => c.group))];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') ?? 'all';
  const [query, setQuery] = useState('');

  function setCategory(id) {
    if (id === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', id);
    }
    setSearchParams(searchParams);
  }

  const products = useMemo(() => {
    let list = activeCategory === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeCategory);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.tagline?.toLowerCase().includes(q));
    }
    return list;
  }, [activeCategory, query]);

  const activeLabel = activeCategory === 'all' ? 'All Products' : CATEGORIES.find((c) => c.id === activeCategory)?.label;

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

          {GROUPS.map((group) => (
            <div key={group} className="shop-category-group">
              <span className="shop-category-group-label">{group}</span>
              {CATEGORIES.filter((c) => c.group === group).map((c) => (
                <button key={c.id} className={`shop-category-link ${activeCategory === c.id ? 'active' : ''}`} onClick={() => setCategory(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="shop-main">
          <div className="section-head">
            <div>
              <span className="eyebrow">Shop</span>
              <h1 className="shop-heading">{activeLabel}</h1>
            </div>
            <span className="muted">{products.length} product{products.length === 1 ? '' : 's'}</span>
          </div>

          {products.length === 0 ? (
            <p className="muted">No products match that search. Try a different term or category.</p>
          ) : (
            <div className="grid grid-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
