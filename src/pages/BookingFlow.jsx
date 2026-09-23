import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getServiceById } from '../data/services.js';
import { PRODUCTS } from '../data/products.js';
import { useCart } from '../context/CartContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import Icon from '../components/Icon.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { fetchServiceById } from '../api/services.js';

const TANK_SIZES = ['5 gal', '10 gal', '20 gal', '29 gal', '55 gal', '75 gal', '100+ gal'];
const DESIGN_STYLES = {
  Freshwater: ['Planted / Aquascape', 'Minimalist', 'Biotope', 'Community Mixed'],
  Marine: ['Reef', 'Fish-Only', 'Minimalist'],
};
const TIME_SLOTS = ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM', '5:00 PM'];

const STOCK_OPTIONS = {
  Freshwater: PRODUCTS.filter((p) => p.category === 'freshwater' || p.category === 'plants').slice(0, 8),
  Marine: PRODUCTS.filter((p) => p.category === 'marine' || p.category === 'inverts').slice(0, 6),
};

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function BookingFlow() {
  const { serviceId } = useParams();
  // The Services page books against the live API (uuid ids); the curated
  // teaser on the homepage still links to the mock catalog's slug ids until
  // that page's own integration pass. Try live first, then fall back.
  const mockService = getServiceById(serviceId);
  const [service, setService] = useState(mockService ?? null);
  const [loadingService, setLoadingService] = useState(!mockService);
  useEffect(() => {
    let cancelled = false;
    setLoadingService(!getServiceById(serviceId));
    fetchServiceById(serviceId)
      .then((s) => {
        if (!cancelled) setService(s);
      })
      .catch(() => {
        if (!cancelled) setService(getServiceById(serviceId) ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoadingService(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId]);
  const location = useLocation();
  const navigate = useNavigate();
  const { addBookedService, addAquariumSetup } = useCart();

  const isSetupFlow = service?.flow === 'aquarium-setup';
  const steps = useMemo(() => buildSteps(isSetupFlow, service), [isSetupFlow, service]);

  const [stepIndex, setStepIndex] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [data, setData] = useState({
    size: '',
    waterType: '',
    style: '',
    stock: [],
    date: todayPlus(3),
    time: '',
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  if (!service) {
    return (
      <section className="section container">
        {loadingService ? (
          <p className="muted">Loading service…</p>
        ) : (
          <>
            <h1>Service not found</h1>
            <Link to="/services" className="btn btn-outline">
              Back to Services
            </Link>
          </>
        )}
      </section>
    );
  }

  function update(patch) {
    setData((d) => ({ ...d, ...patch }));
  }

  function toggleStock(id) {
    setData((d) => ({ ...d, stock: d.stock.includes(id) ? d.stock.filter((x) => x !== id) : [...d.stock, id] }));
  }

  const currentStep = steps[stepIndex];
  const canProceed = isStepValid(currentStep.id, data);

  function goNext() {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
  }
  function goBack() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  function handleConfirm() {
    addBookedService({
      serviceId: service.id,
      name: service.name,
      icon: service.icon,
      price: service.price,
      date: data.date,
      time: data.time,
      address: data.address || null,
      contact: { name: data.name, email: data.email, phone: data.phone },
      details: isSetupFlow ? { size: data.size, waterType: data.waterType, style: data.style } : undefined,
    });

    if (isSetupFlow && data.stock.length > 0) {
      const options = STOCK_OPTIONS[data.waterType] ?? [];
      addAquariumSetup({
        label: `${service.name} — ${data.size}`,
        lines: data.stock.map((id) => ({ id, qty: 1, product: options.find((p) => p.id === id) })),
      });
    }

    setConfirmed(true);
  }

  if (confirmed) {
    return (
      <section className="section container">
        <div className="card card-pad checkout-confirm">
          <span className="value-icon">
            <Icon name="calendar" size={48} />
          </span>
          <h1>Appointment booked!</h1>
          <p className="muted">
            {service.name} is booked for {formatDate(data.date)} at {data.time}. Any fish, plants, or equipment you picked
            have been added to your cart.
          </p>
          <div className="hero-actions" style={{ justifyContent: 'center' }}>
            <Link to="/cart" className="btn btn-primary">
              View Cart
            </Link>
            <Link to="/services" className="btn btn-outline">
              Book Another Service
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section container">
      <nav className="breadcrumbs muted">
        <Link to="/services">Services</Link> / {service.name}
      </nav>
      <h1 className="booking-title">
        <Icon name={service.icon} size={28} /> {service.name}
      </h1>

      <ol className="stepper">
        {steps.map((step, i) => (
          <li key={step.id} className={i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}>
            <span className="stepper-dot">{i < stepIndex ? <Icon name="check" size={12} /> : i + 1}</span>
            <span className="stepper-label">{step.label}</span>
          </li>
        ))}
      </ol>

      <div className="card card-pad booking-step">
        <StepContent
          step={currentStep}
          data={data}
          update={update}
          toggleStock={toggleStock}
          service={service}
          locationState={location.state}
        />
      </div>

      <div className="booking-nav">
        <button className="btn btn-outline" onClick={goBack} disabled={stepIndex === 0}>
          Back
        </button>
        {stepIndex < steps.length - 1 ? (
          <button className="btn btn-primary" onClick={goNext} disabled={!canProceed}>
            Continue
          </button>
        ) : (
          <button className="btn btn-coral" onClick={handleConfirm} disabled={!canProceed}>
            Book Appointment
          </button>
        )}
      </div>
    </section>
  );
}

function buildSteps(isSetupFlow, service) {
  if (!service) return [];
  if (isSetupFlow) {
    return [
      { id: 'size', label: 'Aquarium Size' },
      { id: 'waterType', label: 'Freshwater / Marine' },
      { id: 'style', label: 'Design Style' },
      { id: 'stock', label: 'Add Fish & Plants' },
      { id: 'date', label: 'Visit Date' },
      { id: 'time', label: 'Time Slot' },
      { id: 'address', label: 'Address' },
      { id: 'review', label: 'Confirm' },
    ];
  }
  const steps = [
    { id: 'date', label: 'Date' },
    { id: 'time', label: 'Time Slot' },
    { id: 'contact', label: 'Your Details' },
  ];
  if (service.location === 'home-visit') steps.push({ id: 'address', label: 'Address' });
  steps.push({ id: 'review', label: 'Confirm' });
  return steps;
}

function isStepValid(stepId, data) {
  switch (stepId) {
    case 'size':
      return Boolean(data.size);
    case 'waterType':
      return Boolean(data.waterType);
    case 'style':
      return Boolean(data.style);
    case 'stock':
      return true; // optional
    case 'date':
      return Boolean(data.date);
    case 'time':
      return Boolean(data.time);
    case 'contact':
      return Boolean(data.name && data.email);
    case 'address':
      return Boolean(data.address);
    case 'review':
      return true;
    default:
      return true;
  }
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function StepContent({ step, data, update, toggleStock, service, locationState }) {
  const { format } = useCurrency();
  switch (step.id) {
    case 'size':
      return (
        <FieldGroup title="What size is your aquarium?">
          <ChoiceGrid options={TANK_SIZES} value={data.size} onChange={(v) => update({ size: v })} />
        </FieldGroup>
      );

    case 'waterType':
      return (
        <FieldGroup title="Freshwater or marine?">
          <ChoiceGrid options={['Freshwater', 'Marine']} value={data.waterType} onChange={(v) => update({ waterType: v, style: '', stock: [] })} />
        </FieldGroup>
      );

    case 'style': {
      const options = DESIGN_STYLES[data.waterType] ?? [...DESIGN_STYLES.Freshwater, ...DESIGN_STYLES.Marine];
      return (
        <FieldGroup title="Pick a design style">
          <ChoiceGrid options={options} value={data.style} onChange={(v) => update({ style: v })} />
        </FieldGroup>
      );
    }

    case 'stock': {
      const options = STOCK_OPTIONS[data.waterType] ?? [];
      return (
        <FieldGroup title="Add fish & plants to your setup (optional)" hint="Selected items are added to your cart alongside the booking.">
          <div className="stock-grid">
            {options.map((p) => (
              <label key={p.id} className={`stock-option ${data.stock.includes(p.id) ? 'active' : ''}`}>
                <input type="checkbox" checked={data.stock.includes(p.id)} onChange={() => toggleStock(p.id)} />
                <span className="inline-thumb">
                  <ProductImage product={p} aspect="1 / 1" />
                </span>
                <span>{p.name}</span>
                <span className="muted">{format(p.price)}</span>
              </label>
            ))}
          </div>
        </FieldGroup>
      );
    }

    case 'date':
      return (
        <FieldGroup title={service.flow === 'aquarium-setup' ? 'Choose a home visit date' : 'Choose a date'}>
          <input type="date" className="input" min={todayPlus(1)} value={data.date} onChange={(e) => update({ date: e.target.value })} style={{ maxWidth: '16rem' }} />
        </FieldGroup>
      );

    case 'time':
      return (
        <FieldGroup title="Choose a time slot">
          <ChoiceGrid options={TIME_SLOTS} value={data.time} onChange={(v) => update({ time: v })} />
        </FieldGroup>
      );

    case 'address':
      return (
        <FieldGroup title="Where should we come?">
          {locationState?.productName && (
            <p className="muted" style={{ marginTop: '-0.5rem' }}>
              Scheduling delivery for: <strong>{locationState.productName}</strong>
            </p>
          )}
          <textarea className="input" placeholder="Street address, city, ZIP" value={data.address} onChange={(e) => update({ address: e.target.value })} />
        </FieldGroup>
      );

    case 'contact':
      return (
        <FieldGroup title="Your details">
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="bf-name">Name</label>
              <input id="bf-name" className="input" value={data.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="bf-email">Email</label>
              <input id="bf-email" type="email" className="input" value={data.email} onChange={(e) => update({ email: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="bf-phone">Phone (optional)</label>
            <input id="bf-phone" className="input" value={data.phone} onChange={(e) => update({ phone: e.target.value })} />
          </div>
        </FieldGroup>
      );

    case 'review':
      return (
        <FieldGroup title="Review your booking">
          <table className="spec-table">
            <tbody>
              <tr>
                <th>Service</th>
                <td>{service.name}</td>
              </tr>
              {data.size && (
                <tr>
                  <th>Aquarium Size</th>
                  <td>{data.size}</td>
                </tr>
              )}
              {data.waterType && (
                <tr>
                  <th>Water Type</th>
                  <td>{data.waterType}</td>
                </tr>
              )}
              {data.style && (
                <tr>
                  <th>Design Style</th>
                  <td>{data.style}</td>
                </tr>
              )}
              {data.stock?.length > 0 && (
                <tr>
                  <th>Fish &amp; Plants</th>
                  <td>{data.stock.length} item(s) added to cart</td>
                </tr>
              )}
              <tr>
                <th>Date</th>
                <td>{formatDate(data.date)}</td>
              </tr>
              <tr>
                <th>Time</th>
                <td>{data.time}</td>
              </tr>
              {data.address && (
                <tr>
                  <th>Address</th>
                  <td>{data.address}</td>
                </tr>
              )}
              {data.name && (
                <tr>
                  <th>Contact</th>
                  <td>
                    {data.name} · {data.email}
                  </td>
                </tr>
              )}
              <tr>
                <th>Price</th>
                <td>
                  {format(service.price)}
                  {service.priceNote ? ` ${service.priceNote}` : ''}
                </td>
              </tr>
            </tbody>
          </table>
        </FieldGroup>
      );

    default:
      return null;
  }
}

function FieldGroup({ title, hint, children }) {
  return (
    <div>
      <h3 className="booking-step-title">{title}</h3>
      {hint && <p className="muted" style={{ marginTop: '-0.5rem' }}>{hint}</p>}
      {children}
    </div>
  );
}

function ChoiceGrid({ options, value, onChange }) {
  return (
    <div className="choice-grid">
      {options.map((opt) => (
        <button key={opt} type="button" className={`choice-chip ${value === opt ? 'active' : ''}`} onClick={() => onChange(opt)}>
          {opt}
        </button>
      ))}
    </div>
  );
}
