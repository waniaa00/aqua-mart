import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import Icon from './Icon.jsx';
import CurrencySelector from './CurrencySelector.jsx';

const LOGO_SRC = '/images/brand/logo.png';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/services', label: 'Services' },
  { to: '/build-my-aquarium', label: 'Build My Aquarium' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function Header() {
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <img src={LOGO_SRC} alt="Aqua Mart" className="brand-logo" />
        </Link>

        <nav className={`site-nav ${menuOpen ? 'open' : ''}`} aria-label="Main">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `site-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-header-actions">
          <CurrencySelector />

          <Link to="/cart" className="cart-link" aria-label={`Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`}>
            <Icon name="cart" size={22} />
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
          </Link>

          <button
            className="menu-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
