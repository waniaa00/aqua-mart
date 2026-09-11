import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProductById } from '../data/products.js';
import { useCart } from '../context/CartContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import Icon from '../components/Icon.jsx';
import ProductImage from '../components/ProductImage.jsx';

const STYLES = ['Planted', 'Minimalist', 'Community', 'Biotope'];
const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// A plain rule-based recommender, not a real optimizer or AI - it picks a
// sensible, explainable stocking + equipment list from the existing catalog
// based on a few straightforward thresholds. Good enough to be genuinely
// useful, and a clear foundation to swap in something smarter later.
function buildRecommendation({ size, experience, style }) {
  const lines = [];
  const planted = style === 'Planted' || style === 'Biotope';

  // --- livestock, scaled by tank size and experience ----------------------
  if (size <= 10) {
    lines.push({ id: 'betta-royal-blue', qty: 1 });
  } else if (size <= 20) {
    lines.push({ id: 'neon-tetra', qty: 6 });
    lines.push({ id: 'guppy-fancy-mix', qty: 4 });
  } else if (size <= 40) {
    lines.push({ id: 'neon-tetra', qty: 6 });
    if (experience === 'Beginner') {
      lines.push({ id: 'molly-black', qty: 4 });
    } else {
      lines.push({ id: 'angelfish-marble', qty: 1 });
    }
  } else {
    lines.push({ id: 'neon-tetra', qty: 8 });
    lines.push({ id: 'angelfish-marble', qty: 1 });
    lines.push({ id: 'molly-black', qty: 4 });
  }

  if (experience !== 'Beginner' && size > 20) {
    lines.push({ id: 'cherry-shrimp', qty: 1 }); // pack of 5 - cleanup crew for a more experienced setup
  }

  // --- plants / decor -------------------------------------------------------
  if (planted) {
    lines.push({ id: 'java-fern', qty: 1 });
    lines.push({ id: 'anubias-nana', qty: 1 });
    if (size > 29) lines.push({ id: 'amazon-sword', qty: 1 });
  } else {
    lines.push({ id: 'decor-castle', qty: 1 });
    lines.push({ id: 'decor-driftwood', qty: 1 });
  }

  // --- substrate --------------------------------------------------------------
  lines.push({ id: planted ? 'substrate-planted' : 'substrate-river-gravel', qty: 1 });

  // --- core equipment, sized by tank -------------------------------------------
  lines.push({ id: size <= 30 ? 'filter-hob-30' : 'filter-canister-75', qty: 1 });
  lines.push({ id: size <= 20 ? 'heater-50w' : 'heater-150w', qty: 1 });
  lines.push({ id: 'light-led-planted', qty: 1 }); // doubles as a general-purpose fixture even without live plants
  lines.push({ id: 'conditioner-declor', qty: 1 });

  // merge duplicate ids (e.g. if a rule above ever adds the same item twice)
  const merged = new Map();
  for (const line of lines) {
    merged.set(line.id, { id: line.id, qty: (merged.get(line.id)?.qty ?? 0) + line.qty });
  }

  return [...merged.values()]
    .map((line) => ({ ...line, product: getProductById(line.id) }))
    .filter((line) => line.product);
}

export default function BuildMyAquarium() {
  const { addAquariumSetup } = useCart();
  const { format } = useCurrency();
  const [size, setSize] = useState(20);
  const [experience, setExperience] = useState('Beginner');
  const [style, setStyle] = useState('Planted');
  const [budget, setBudget] = useState(200);
  const [added, setAdded] = useState(false);

  const recommendation = useMemo(() => buildRecommendation({ size, experience, style }), [size, experience, style]);
  const total = recommendation.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const overBudget = total > budget;

  function handleAdd() {
    addAquariumSetup({
      label: `Build My Aquarium — ${size} gal ${style}`,
      lines: recommendation.map((l) => ({ id: l.id, qty: l.qty })),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-inline">
          <span className="eyebrow">Build My Aquarium</span>
          <h1>Tell us your tank. We'll build the setup.</h1>
          <p className="lede">
            A straightforward, rule-based recommendation engine — tell it your tank size, experience, style, and budget,
            and it puts together a compatible list of fish, plants, and equipment from our catalog.
          </p>
        </div>

        <div className="build-layout">
          <div className="card card-pad build-form">
            <div className="field">
              <label htmlFor="bma-size">Tank size: {size} gallons</label>
              <input id="bma-size" type="range" min="5" max="75" step="5" value={size} onChange={(e) => setSize(Number(e.target.value))} />
            </div>

            <div className="field">
              <label>Experience</label>
              <div className="choice-grid">
                {EXPERIENCE_LEVELS.map((level) => (
                  <button key={level} type="button" className={`choice-chip ${experience === level ? 'active' : ''}`} onClick={() => setExperience(level)}>
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Style</label>
              <div className="choice-grid">
                {STYLES.map((s) => (
                  <button key={s} type="button" className={`choice-chip ${style === s ? 'active' : ''}`} onClick={() => setStyle(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="bma-budget">Budget: {format(budget)}</label>
              <input id="bma-budget" type="range" min="50" max="600" step="10" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
            </div>
          </div>

          <div className="card card-pad build-result">
            <h3>
              Your Aquarium Setup <span className="muted">— {size} gal · {experience} · {style}</span>
            </h3>
            <ul className="build-result-list">
              {recommendation.map((line) => (
                <li key={line.id}>
                  <span>
                    <span className="inline-thumb">
                      <ProductImage product={line.product} aspect="1 / 1" />
                    </span>{' '}
                    {line.qty > 1 ? `${line.qty} × ` : ''}
                    {line.product.name}
                  </span>
                  <span className="muted">{format(line.product.price * line.qty)}</span>
                </li>
              ))}
            </ul>
            <hr className="divider" />
            <div className="build-result-total">
              <span>Estimated Total</span>
              <span className="price">{format(total)}</span>
            </div>
            {overBudget ? (
              <p className="muted build-budget-note over">
                This setup runs {format(total - budget)} over your {format(budget)} budget. Try a smaller tank, or book a{' '}
                <Link to="/services/fish-consultation">Fish Consultation</Link> to fine-tune it with us.
              </p>
            ) : (
              <p className="muted build-budget-note">
                Fits your {format(budget)} budget with {format(budget - total)} to spare.
              </p>
            )}
            <button className="btn btn-coral btn-block" onClick={handleAdd}>
              {added ? (
                <>
                  Added to Cart <Icon name="check" size={16} />
                </>
              ) : (
                'Add Complete Setup to Cart'
              )}
            </button>
            <p className="muted build-cta-note">
              Want it delivered and installed?{' '}
              <Link to="/services/aquarium-setup">Book our Aquarium Setup service →</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
