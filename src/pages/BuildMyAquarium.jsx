import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { fetchProducts } from '../api/products.js';
import ProductImage from '../components/ProductImage.jsx';

const STYLES = ['Planted', 'Minimalist', 'Community', 'Biotope'];
const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// Picks up to `count` distinct products from a pool, without repeating one
// within a single recommendation. Returns fewer than `count` (or none) if
// the live catalog doesn't have that many — honest about what's actually
// in stock rather than inventing items.
function pickDistinct(pool, count) {
  return pool.slice(0, count);
}

function findByName(pool, needle) {
  return pool.find((p) => p.name.toLowerCase().includes(needle));
}

// A plain rule-based recommender, not a real optimizer or AI — picks a
// sensible, explainable stocking + equipment list from the *live* catalog
// (FR-024, 002-frontend-integration) based on a few straightforward
// thresholds. The real catalog only models three product types (fish,
// equipment, supply — see data-model.md); there's no plant/decor/substrate
// data to recommend, so the "planted vs. minimalist" style choice doesn't
// currently change the result. The real catalog is also small, so results
// will often be thin — that's the live inventory, not a bug.
function buildRecommendation({ size, experience }, pools) {
  const { fish, equipment, supply } = pools;
  const lines = [];

  // --- livestock, scaled by tank size and experience ----------------------
  const speciesCount = size <= 10 ? 1 : size <= 40 ? 2 : 3;
  const chosen = pickDistinct(fish, speciesCount);
  chosen.forEach((product, i) => {
    let qty = 1;
    if (size > 10) qty = i === 0 ? (size > 40 ? 8 : 6) : experience === 'Beginner' ? 4 : 1;
    lines.push({ product, qty });
  });

  // --- core equipment -----------------------------------------------------------
  const filter = findByName(equipment, 'filter');
  const heater = findByName(equipment, 'heater');
  const light = findByName(equipment, 'light');
  const usedEquipmentIds = new Set();
  for (const item of [filter, heater, light]) {
    if (item && !usedEquipmentIds.has(item.id)) {
      lines.push({ product: item, qty: 1 });
      usedEquipmentIds.add(item.id);
    }
  }
  // Any other equipment not matched by name above, up to 2 more.
  pickDistinct(
    equipment.filter((p) => !usedEquipmentIds.has(p.id)),
    2
  ).forEach((product) => lines.push({ product, qty: 1 }));

  if (supply.length > 0) lines.push({ product: supply[0], qty: 1 });

  return lines;
}

export default function BuildMyAquarium() {
  const { format, currency } = useCurrency();
  const [size, setSize] = useState(20);
  const [experience, setExperience] = useState('Beginner');
  const [style, setStyle] = useState('Planted');
  const [budget, setBudget] = useState(200);

  const [pools, setPools] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    const opts = { limit: 20, currency };
    Promise.all([
      fetchProducts({ ...opts, productType: 'fish', freshwaterOrMarine: 'freshwater' }),
      fetchProducts({ ...opts, productType: 'equipment' }),
      fetchProducts({ ...opts, productType: 'supply' }),
    ])
      .then(([fish, equipment, supply]) => {
        if (cancelled) return;
        setPools({ fish: fish.items, equipment: equipment.items, supply: supply.items });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [currency]);

  const recommendation = useMemo(() => (pools ? buildRecommendation({ size, experience, style }, pools) : []), [pools, size, experience, style]);

  const totalDisplay = recommendation.reduce((sum, l) => sum + Number(l.product.price.display_price) * l.qty, 0);
  const totalMoney = { display_price: totalDisplay, display_currency: currency };
  const compareToBudget = currency === 'USD'; // the budget slider is a fixed USD scale — see note below
  const overBudget = compareToBudget && totalDisplay > budget;

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-inline">
          <span className="eyebrow">Build My Aquarium</span>
          <h1>Tell us your tank. We'll build the setup.</h1>
          <p className="lede">
            A straightforward, rule-based recommendation engine — tell it your tank size and experience, and it puts
            together a compatible list of fish and equipment from our live catalog.
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
              <p className="muted" style={{ marginTop: '0.4rem', marginBottom: 0, fontSize: '0.8rem' }}>
                The live catalog doesn't have plants/decor yet, so style doesn't change picks — kept for when it does.
              </p>
            </div>

            <div className="field">
              <label htmlFor="bma-budget">Budget (USD): ${budget}</label>
              <input id="bma-budget" type="range" min="50" max="600" step="10" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
            </div>
          </div>

          <div className="card card-pad build-result">
            <h3>
              Your Aquarium Setup <span className="muted">— {size} gal · {experience} · {style}</span>
            </h3>

            {status === 'loading' && <p className="muted">Loading the live catalog…</p>}
            {status === 'error' && <p className="muted">Couldn't reach the catalog right now. Please try again shortly.</p>}

            {status === 'ready' &&
              (recommendation.length === 0 ? (
                <p className="muted">No matching setup found in the live catalog right now.</p>
              ) : (
                <>
                  <ul className="build-result-list">
                    {recommendation.map((line) => (
                      <li key={line.product.id}>
                        <span>
                          <span className="inline-thumb">
                            <ProductImage product={line.product} aspect="1 / 1" />
                          </span>{' '}
                          {line.qty > 1 ? `${line.qty} × ` : ''}
                          {line.product.name}
                        </span>
                        <span className="muted">
                          {format({ display_price: Number(line.product.price.display_price) * line.qty, display_currency: currency })}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <hr className="divider" />
                  <div className="build-result-total">
                    <span>Estimated Total</span>
                    <span className="price">{format(totalMoney)}</span>
                  </div>
                  {compareToBudget ? (
                    overBudget ? (
                      <p className="muted build-budget-note over">
                        This setup runs {format({ display_price: totalDisplay - budget, display_currency: currency })} over your $
                        {budget} budget. Try a smaller tank, or book a <Link to="/services/fish-consultation">Fish Consultation</Link>{' '}
                        to fine-tune it with us.
                      </p>
                    ) : (
                      <p className="muted build-budget-note">
                        Fits your ${budget} budget with {format({ display_price: budget - totalDisplay, display_currency: currency })}{' '}
                        to spare.
                      </p>
                    )
                  ) : (
                    <p className="muted build-budget-note">Switch to USD to compare this estimate against your budget.</p>
                  )}
                </>
              ))}

            <p className="muted build-cta-note">
              Browse the <Link to="/shop">full shop</Link> for everything in stock, or want it delivered and installed?{' '}
              <Link to="/services/aquarium-setup">Book our Aquarium Setup service →</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
