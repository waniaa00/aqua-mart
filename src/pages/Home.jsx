import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import HeroScene from '../components/HeroScene.jsx';
import Icon from '../components/Icon.jsx';
import { PRODUCTS, CATEGORIES, CATEGORY_ICON } from '../data/products.js';
import { SERVICES } from '../data/services.js';
import { useCurrency } from '../context/CurrencyContext.jsx';

const FEATURED_IDS = ['betta-royal-blue', 'neon-tetra', 'clownfish-ocellaris', 'tank-29gal', 'java-fern', 'cherry-shrimp'];

// The example build shown in the CTA preview card below - kept separate from
// the live BuildMyAquarium tool since this one is a fixed, hand-picked
// illustration, not a computed recommendation.
const BUILD_PREVIEW_ITEMS = [
  { icon: 'fish', label: '6 × Neon Tetra' },
  { icon: 'fish', label: '4 × Guppy' },
  { icon: 'leaf', label: 'Java Fern' },
  { icon: 'leaf', label: 'Anubias' },
  { icon: 'rock', label: 'Aquarium Gravel' },
  { icon: 'droplet', label: 'Water Conditioner' },
  { icon: 'wrench', label: 'Filter' },
  { icon: 'bulb', label: 'LED Light' },
];

export default function Home() {
  const { format } = useCurrency();
  const featured = FEATURED_IDS.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
  const featuredServices = SERVICES.slice(0, 4);

  return (
    <>
      {/* --- Hero: the jellyfish/ocean scene as a live background --------- */}
      <section className="hero hero-scenic">
        <HeroScene />
        <div className="hero-scrim" aria-hidden="true" />

        <div className="container hero-inner">
          <div>
            <span className="eyebrow">Live Fish · Equipment · Services · Maintenance</span>
            <h1 className="hero-title">Your Complete Aquarium &amp; Aquatic Pet Store</h1>
            <p className="lede">
              From your first betta bowl to a fully aquascaped reef tank — healthy livestock, real equipment, and the
              professional hands to set it all up and keep it thriving.
            </p>
            <div className="hero-actions">
              <Link to="/shop" className="btn btn-primary">
                Shop Live Fish &amp; Gear
              </Link>
              <Link to="/build-my-aquarium" className="btn btn-outline">
                Build My Aquarium
              </Link>
            </div>
          </div>

          <Link to="/experience" className="hero-experience-card">
            <span className="badge">Interactive · Three.js</span>
            <h3>Play With It Yourself</h3>
            <p className="muted">
              What's behind you is live, not a video. Enter the full experience to drag it around, click the water, and
              hear it — a synthesized underwater soundscape.
            </p>
            <span className="hero-experience-cta">Enter the experience →</span>
          </Link>
        </div>
      </section>

      {/* --- Revenue pillars ------------------------------------------------ */}
      <section className="section pillars">
        <div className="container grid grid-4">
          <div className="pillar">
            <span className="pillar-icon">
              <Icon name="fish" size={32} />
            </span>
            <h4>Live Fish</h4>
            <p className="muted">Freshwater, marine, shrimp &amp; snails — quarantine-checked and ready for your tank.</p>
          </div>
          <div className="pillar">
            <span className="pillar-icon">
              <Icon name="cart" size={32} />
            </span>
            <h4>Aquarium Products</h4>
            <p className="muted">Tanks, filtration, lighting, food, and everything else your fish actually need.</p>
          </div>
          <div className="pillar">
            <span className="pillar-icon">
              <Icon name="wrench" size={32} />
            </span>
            <h4>Professional Services</h4>
            <p className="muted">Setup, aquascaping, cleaning, and health consultations — booked online.</p>
          </div>
          <div className="pillar">
            <span className="pillar-icon">
              <Icon name="calendar" size={32} />
            </span>
            <h4>Maintenance Plans</h4>
            <p className="muted">Recurring visits and a monthly care subscription so the tank stays effortless.</p>
          </div>
        </div>
      </section>

      {/* --- Category tiles -------------------------------------------------- */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Shop by Category</span>
              <h2>Everything for the tank</h2>
            </div>
            <Link to="/shop" className="btn btn-ghost">
              View all products →
            </Link>
          </div>
          <div className="category-grid">
            {CATEGORIES.map((cat) => (
              <Link key={cat.id} to={`/shop?category=${cat.id}`} className="category-tile">
                <span className="category-tile-icon">
                  <Icon name={CATEGORY_ICON[cat.id]} size={28} />
                </span>
                <span>{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- Featured products ------------------------------------------------ */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Customer Favorites</span>
              <h2>Featured this week</h2>
            </div>
          </div>
          <div className="grid grid-3">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* --- Services teaser --------------------------------------------------- */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Book Online</span>
              <h2>Professional services, at your door</h2>
            </div>
            <Link to="/services" className="btn btn-ghost">
              View all services →
            </Link>
          </div>
          <div className="grid grid-4">
            {featuredServices.map((service) => (
              <Link key={service.id} to={`/services/${service.id}`} className="card card-pad service-teaser">
                <span className="service-teaser-icon">
                  <Icon name={service.icon} size={28} />
                </span>
                <h4>{service.name}</h4>
                <p className="muted">{service.summary}</p>
                <span className="price">
                  From {format(service.price)}
                  {service.priceNote ? ` ${service.priceNote}` : ''}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- Build My Aquarium CTA ---------------------------------------------- */}
      <section className="section">
        <div className="container">
          <div className="build-cta">
            <div>
              <span className="eyebrow">Not sure where to start?</span>
              <h2>Let us build your aquarium for you</h2>
              <p className="lede">
                Tell us your tank size, experience level, style, and budget — we'll put together a complete, compatible
                setup: fish, plants, substrate, and equipment, with a total price up front.
              </p>
              <Link to="/build-my-aquarium" className="btn btn-coral">
                Try Build My Aquarium →
              </Link>
            </div>
            <div className="build-cta-preview card card-pad">
              <span className="muted">Example setup for a 20 gal · Beginner · Planted · {format(200)} budget</span>
              <ul className="build-preview-list">
                {BUILD_PREVIEW_ITEMS.map((item) => (
                  <li key={item.label}>
                    <Icon name={item.icon} size={16} /> {item.label}
                  </li>
                ))}
              </ul>
              <div className="build-preview-total">
                <span className="muted">Estimated Total</span>
                <span className="price">{format(185)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
