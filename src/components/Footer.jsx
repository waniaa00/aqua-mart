import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer-main">
      <div className="container footer-grid">
        <div>
          <div className="brand footer-brand">
            <img src="/images/brand/logo.png" alt="Aqua Mart" className="brand-logo" />
          </div>
          <p className="muted footer-blurb">
            Your complete aquarium &amp; aquatic pet store — live fish, equipment, and the professional services to keep it
            all thriving.
          </p>
        </div>

        <div>
          <h4>Shop</h4>
          <ul className="footer-links">
            <li><Link to="/shop">All Products</Link></li>
            <li><Link to="/shop?category=freshwater">Freshwater Fish</Link></li>
            <li><Link to="/shop?category=marine">Marine Fish</Link></li>
            <li><Link to="/shop?category=tanks">Aquariums &amp; Tanks</Link></li>
          </ul>
        </div>

        <div>
          <h4>Services</h4>
          <ul className="footer-links">
            <li><Link to="/services">All Services</Link></li>
            <li><Link to="/build-my-aquarium">Build My Aquarium</Link></li>
            <li><Link to="/experience">Explore Our Living Aquarium</Link></li>
          </ul>
        </div>

        <div>
          <h4>Company</h4>
          <ul className="footer-links">
            <li><Link to="/about">About</Link></li>
            <li><Link to="/gallery">Gallery</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
      </div>

      <div className="container footer-bottom">
        <span className="muted">© {new Date().getFullYear()} Aqua Mart. Prototype site.</span>
        <span className="muted">Developed by Wania A</span>
      </div>
    </footer>
  );
}
