import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { fetchProducts } from '../api/products.js';
import { fetchServices } from '../api/services.js';
import { fetchOrders } from '../api/orders.js';
import { listOrders } from '../api/admin_orders.js';
import { listCustomers } from '../api/admin_customers.js';

const DEBOUNCE_MS = 300;

// Self-contained search: owns its own input, debounce, and keyboard
// navigation (grouped results in a flat list so Up/Down/Enter can move
// through every group). No single backend endpoint spans these resource
// types (FR-029) — this fans out to 2-3 existing per-resource endpoints
// in parallel and groups client-side, same pattern for both roles.
export default function GlobalSearch({ role, token }) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [debounced, setDebounced] = useState('');
  const [groups, setGroups] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'ready'
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    if (!debounced) {
      setGroups([]);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');

    const searches =
      role === 'admin'
        ? [
            fetchProducts({ search: debounced, limit: 5 }).then((r) => ({ label: 'Products', items: r.items.map((p) => ({ id: p.productId, label: p.name, to: `/product/${p.id}` })) })),
            listOrders(token, { search: debounced, limit: 5 }).then((r) => ({ label: 'Orders', items: r.items.map((o) => ({ id: o.id, label: `${o.id.slice(0, 8)} — ${o.customer_name || o.customer_email}`, to: `/admin/orders?status=${o.status}` })) })),
            listCustomers(token, { search: debounced, limit: 5 }).then((r) => ({ label: 'Customers', items: r.items.map((c) => ({ id: c.id, label: `${c.name} (${c.email})`, to: `/admin/customers` })) })),
          ]
        : [
            fetchProducts({ search: debounced, limit: 5 }).then((r) => ({ label: 'Products', items: r.items.map((p) => ({ id: p.productId, label: p.name, to: `/product/${p.id}` })) })),
            fetchServices().then((all) => ({
              label: 'Services',
              items: all.filter((s) => s.name.toLowerCase().includes(debounced.toLowerCase())).slice(0, 5).map((s) => ({ id: s.id, label: s.name, to: `/services/${s.id}` })),
            })),
            token
              ? fetchOrders(token, { limit: 100 }).then((r) => ({
                  label: 'My Orders',
                  items: r.items
                    .filter((o) => o.id.toLowerCase().startsWith(debounced.toLowerCase()) || o.items.some((i) => i.product_name.toLowerCase().includes(debounced.toLowerCase())))
                    .slice(0, 5)
                    .map((o) => ({ id: o.id, label: `Order ${o.id.slice(0, 8)} — ${o.status}`, to: '/dashboard' })),
                }))
              : Promise.resolve({ label: 'My Orders', items: [] }),
          ];

    Promise.all(searches.map((p) => p.catch(() => ({ label: '', items: [] }))))
      .then((results) => {
        if (cancelled) return;
        setGroups(results.filter((g) => g.items.length > 0));
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('ready'));

    return () => {
      cancelled = true;
    };
  }, [debounced, role, token]);

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function goTo(item) {
    setOpen(false);
    setValue('');
    navigate(item.to);
  }

  function handleKeyDown(e) {
    if (!open || flatItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      goTo(flatItems[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  let runningIndex = -1;

  return (
    <div className="dashboard-header-search" ref={containerRef}>
      <Icon name="search" size={16} />
      <input
        className="input"
        type="search"
        placeholder="Search…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => value && setOpen(true)}
        onKeyDown={handleKeyDown}
        aria-label="Search"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && debounced && (
        <div className="global-search-dropdown">
          {status === 'loading' && <p className="muted" style={{ padding: '0.75rem' }}>Searching…</p>}
          {status === 'ready' && groups.length === 0 && <p className="muted" style={{ padding: '0.75rem' }}>No results found.</p>}
          {status === 'ready' &&
            groups.map((group) => (
              <div key={group.label} className="global-search-group">
                <p className="global-search-group-label">{group.label}</p>
                {group.items.map((item) => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`global-search-item ${idx === activeIndex ? 'active' : ''}`}
                      onMouseDown={() => goTo(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
