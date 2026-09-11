import { useState } from 'react';
import PlaceholderArt from '../components/PlaceholderArt.jsx';
import PhotoImage from '../components/PhotoImage.jsx';

const FILTERS = ['All', 'Tanks We\'ve Built', 'Livestock', 'Aquascapes'];

const CATEGORY_ICON = {
  'Tanks We\'ve Built': 'tank',
  Livestock: 'fish',
  Aquascapes: 'leaf',
};

// `slug` maps to /images/gallery/<slug>.jpg - same "drop a photo in, no code
// change needed" pattern as the product catalog (see PhotoImage.jsx). Not
// every item has one yet; those fall back to the icon placeholder.
const GALLERY_ITEMS = [
  { id: 1, slug: '55-gallon-planted-community', title: '55 Gallon Planted Community', category: 'Tanks We\'ve Built', gradient: ['#204a6e', '#050e18'] },
  { id: 2, slug: 'electric-yellow-cichlid-colony', title: 'Electric Yellow Cichlid Colony', category: 'Livestock', gradient: ['#f4d229', '#2a2205'] },
  { id: 3, slug: 'iwagumi-layout-20-gal', title: 'Iwagumi Layout, 20 Gal', category: 'Aquascapes', gradient: ['#2f8f3a', '#081a0a'] },
  { id: 4, slug: 'reef-corner-mixed-lps', title: 'Reef Corner, Mixed LPS', category: 'Aquascapes', gradient: ['#ff7a2e', '#210a02'] },
  { id: 5, slug: 'betta-sorority-20-long', title: 'Betta Sorority, 20 Long', category: 'Tanks We\'ve Built', gradient: ['#2a5fd6', '#0a1230'] },
  { id: 6, slug: 'neon-tetra-shoal', title: 'Neon Tetra Shoal', category: 'Livestock', gradient: ['#22b7d6', '#0a1a2a'] },
  { id: 7, slug: 'dutch-style-planted-40b', title: 'Dutch-Style Planted 40B', category: 'Aquascapes', gradient: ['#1e6b3a', '#071409'] },
  { id: 8, slug: 'marine-display-ocellaris-pair', title: 'Marine Display, Ocellaris Pair', category: 'Livestock', gradient: ['#ff7a2e', '#1c0a02'] },
  { id: 9, slug: 'rimless-75-gal-rebuild', title: 'Rimless 75 Gal Rebuild', category: 'Tanks We\'ve Built', gradient: ['#2a5a7a', '#08131c'] },
];

export default function Gallery() {
  const [filter, setFilter] = useState('All');
  const items = filter === 'All' ? GALLERY_ITEMS : GALLERY_ITEMS.filter((i) => i.category === filter);

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-inline">
          <span className="eyebrow">Gallery</span>
          <h1>Tanks, fish, and aquascapes we're proud of</h1>
          <p className="lede">A look at real setups from the shop and from client homes.</p>
        </div>

        <div className="filter-row">
          {FILTERS.map((f) => (
            <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>

        <div className="gallery-grid">
          {items.map((item) => (
            <figure key={item.id} className="card gallery-item">
              <PhotoImage
                key={item.slug}
                src={`/images/gallery/${item.slug}.jpg`}
                alt={item.title}
                aspect="1 / 1"
                fallback={<PlaceholderArt icon={CATEGORY_ICON[item.category]} gradient={item.gradient} aspect="1 / 1" size={44} />}
              />
              <figcaption className="card-pad">
                <span className="tag">{item.category}</span>
                <p className="gallery-item-title">{item.title}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
