import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PRODUCTS } from '../data/products.js';
import { fetchAddresses } from '../api/account.js';
import { bookAppointment } from '../api/appointments.js';
import { fetchServiceById, fetchSlots } from '../api/services.js';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import Icon from '../components/Icon.jsx';
import ProductImage from '../components/ProductImage.jsx';

const TANK_SIZES = ['5 gal', '10 gal', '20 gal', '29 gal', '55 gal', '75 gal', '100+ gal'];
const DESIGN_STYLES = {
  Freshwater: ['Planted / Aquascape', 'Minimalist', 'Biotope', 'Community Mixed'],
  Marine: ['Reef', 'Fish-Only', 'Minimalist'],
};

// Purely informational at this step (not added to any cart) — lets someone
// planning a setup flag what they're interested in; it's folded into the
// appointment's notes for the technician to see.
const STOCK_OPTIONS = {
  Freshwater: PRODUCTS.filter((p) => p.category === 'freshwater' || p.category === 'plants').slice(0, 8),
  Marine: PRODUCTS.filter((p) => p.category === 'marine' || p.category === 'inverts').slice(0, 6),
};

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatTime(hhmmss) {
  const [h, m] = hhmmss.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function BookingFlow() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, token } = useCustomerAuth();
  const { format } = useCurrency();

  const [service, setService] = useState(null);
  const [serviceStatus, setServiceStatus] = useState('loading'); // 'loading' | 'ready' | 'not-found'

  useEffect(() => {
    let cancelled = false;
    setServiceStatus('loading');
    fetchServiceById(serviceId)
      .then((s) => {
        if (!cancelled) {
          setService(s);
          setServiceStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setServiceStatus('not-found');
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  const isSetupFlow = service?.flow === 'aquarium-setup';
  const needsAddress = service?.location === 'home-visit';
  const steps = useMemo(() => buildSteps(isSetupFlow, needsAddress), [isSetupFlow, needsAddress]);

  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState({
    size: '',
    waterType: '',
    style: '',
    stock: [],
    date: todayPlus(3),
    slotId: '',
    slotLabel: '',
    addressId: '',
    notes: '',
  });

  const [slots, setSlots] = useState([]);
  const [slotsStatus, setSlotsStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [addresses, setAddresses] = useState(null);

  const [confirmed, setConfirmed] = useState(null);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  useEffect(() => {
    if (!service?.id || !data.date) return;
    let cancelled = false;
    setSlotsStatus('loading');
    setData((d) => ({ ...d, slotId: '', slotLabel: '' }));
    fetchSlots(service.id, data.date)
      .then((res) => {
        if (!cancelled) {
          setSlots(res);
          setSlotsStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setSlotsStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.id, data.date]);

  useEffect(() => {
    if (!needsAddress || !token) return;
    let cancelled = false;
    fetchAddresses(token).then((list) => {
      if (cancelled) return;
      setAddresses(list);
      const def = list.find((a) => a.is_default) ?? list[0];
      if (def) setData((d) => ({ ...d, addressId: d.addressId || def.id }));
    });
    return () => {
      cancelled = true;
    };
  }, [needsAddress, token]);

  if (serviceStatus === 'loading') {
    return (
      <section className="section container">
        <p className="muted">Loading service…</p>
      </section>
    );
  }

  if (serviceStatus === 'not-found') {
    return (
      <section className="section container">
        <h1>Service not found</h1>
        <Link to="/services" className="btn btn-outline">
          Back to Services
        </Link>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="section container">
        <h1>{service.name}</h1>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <p className="muted">Log in to book this service.</p>
          <Link to="/account/login" state={{ from: `/services/${serviceId}` }} className="btn btn-primary">
            Log In
          </Link>
        </div>
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

  async function handleConfirm() {
    setBookingError(null);
    setBooking(true);
    try {
      const notesParts = [];
      if (isSetupFlow) {
        if (data.size) notesParts.push(`Tank size: ${data.size}`);
        if (data.waterType) notesParts.push(`Water type: ${data.waterType}`);
        if (data.style) notesParts.push(`Style: ${data.style}`);
        if (data.stock.length > 0) {
          const options = STOCK_OPTIONS[data.waterType] ?? [];
          const names = data.stock.map((id) => options.find((p) => p.id === id)?.name).filter(Boolean);
          if (names.length > 0) notesParts.push(`Interested in: ${names.join(', ')}`);
        }
      }
      if (data.notes.trim()) notesParts.push(data.notes.trim());

      const appointment = await bookAppointment(token, {
        serviceId: service.id,
        slotId: data.slotId,
        addressId: needsAddress ? data.addressId : null,
        notes: notesParts.join(' — ') || null,
      });
      setConfirmed(appointment);
    } catch (err) {
      setBookingError(err.message ?? 'Could not book this appointment. Please try again.');
    } finally {
      setBooking(false);
    }
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
            {confirmed.service_name} is booked for {formatDate(confirmed.date)} at {formatTime(confirmed.start_time)}.
          </p>
          <div className="hero-actions" style={{ justifyContent: 'center' }}>
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
          slots={slots}
          slotsStatus={slotsStatus}
          addresses={addresses}
          format={format}
        />
      </div>

      {bookingError && (
        <p role="alert" style={{ color: 'var(--danger)' }}>
          {bookingError}
        </p>
      )}

      <div className="booking-nav">
        <button className="btn btn-outline" onClick={goBack} disabled={stepIndex === 0}>
          Back
        </button>
        {stepIndex < steps.length - 1 ? (
          <button className="btn btn-primary" onClick={goNext} disabled={!canProceed}>
            Continue
          </button>
        ) : (
          <button className="btn btn-coral" onClick={handleConfirm} disabled={!canProceed || booking}>
            {booking ? 'Booking…' : 'Book Appointment'}
          </button>
        )}
      </div>
    </section>
  );
}

function buildSteps(isSetupFlow, needsAddress) {
  const steps = isSetupFlow
    ? [
        { id: 'size', label: 'Aquarium Size' },
        { id: 'waterType', label: 'Freshwater / Marine' },
        { id: 'style', label: 'Design Style' },
        { id: 'stock', label: 'Fish & Plants' },
        { id: 'date', label: 'Visit Date' },
        { id: 'time', label: 'Time Slot' },
      ]
    : [
        { id: 'date', label: 'Date' },
        { id: 'time', label: 'Time Slot' },
      ];
  if (needsAddress) steps.push({ id: 'address', label: 'Address' });
  steps.push({ id: 'notes', label: 'Notes' }, { id: 'review', label: 'Confirm' });
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
      return Boolean(data.slotId);
    case 'address':
      return Boolean(data.addressId);
    case 'notes':
      return true; // optional
    case 'review':
      return true;
    default:
      return true;
  }
}

function StepContent({ step, data, update, toggleStock, service, slots, slotsStatus, addresses, format }) {
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
        <FieldGroup title="Fish & plants you're interested in (optional)" hint="Just for the technician's reference — not added to any cart.">
          <div className="stock-grid">
            {options.map((p) => (
              <label key={p.id} className={`stock-option ${data.stock.includes(p.id) ? 'active' : ''}`}>
                <input type="checkbox" checked={data.stock.includes(p.id)} onChange={() => toggleStock(p.id)} />
                <span className="inline-thumb">
                  <ProductImage product={p} aspect="1 / 1" />
                </span>
                <span>{p.name}</span>
              </label>
            ))}
          </div>
        </FieldGroup>
      );
    }

    case 'date':
      return (
        <FieldGroup title={service.flow === 'aquarium-setup' ? 'Choose a home visit date' : 'Choose a date'}>
          <input
            type="date"
            className="input"
            min={todayPlus(1)}
            value={data.date}
            onChange={(e) => update({ date: e.target.value })}
            style={{ maxWidth: '16rem' }}
          />
        </FieldGroup>
      );

    case 'time':
      return (
        <FieldGroup title="Choose a time slot">
          {slotsStatus === 'loading' && <p className="muted">Loading available times…</p>}
          {slotsStatus === 'error' && <p className="muted">Couldn't load times for that date.</p>}
          {slotsStatus === 'ready' &&
            (slots.length === 0 ? (
              <p className="muted">No open slots on that date — try another day.</p>
            ) : (
              <div className="choice-grid">
                {slots.map((s) => {
                  const full = s.is_blocked || s.remaining_capacity <= 0;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`choice-chip ${data.slotId === s.id ? 'active' : ''}`}
                      disabled={full}
                      onClick={() => update({ slotId: s.id, slotLabel: formatTime(s.start_time) })}
                    >
                      {formatTime(s.start_time)}
                      {full ? ' (full)' : ''}
                    </button>
                  );
                })}
              </div>
            ))}
        </FieldGroup>
      );

    case 'address':
      return (
        <FieldGroup title="Where should we come?">
          {addresses === null ? (
            <p className="muted">Loading addresses…</p>
          ) : addresses.length === 0 ? (
            <p className="muted">
              You have no saved addresses. <Link to="/account">Add one</Link> before booking a home visit.
            </p>
          ) : (
            <select className="input" value={data.addressId} onChange={(e) => update({ addressId: e.target.value })} style={{ maxWidth: '28rem' }}>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name} — {a.address_line}, {a.city}
                </option>
              ))}
            </select>
          )}
        </FieldGroup>
      );

    case 'notes':
      return (
        <FieldGroup title="Anything we should know? (optional)">
          <textarea
            className="input"
            placeholder="Notes for the technician…"
            value={data.notes}
            onChange={(e) => update({ notes: e.target.value })}
          />
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
              <tr>
                <th>Date</th>
                <td>{formatDate(data.date)}</td>
              </tr>
              <tr>
                <th>Time</th>
                <td>{data.slotLabel}</td>
              </tr>
              {data.notes && (
                <tr>
                  <th>Notes</th>
                  <td>{data.notes}</td>
                </tr>
              )}
              <tr>
                <th>Price</th>
                <td>
                  From {format(service.price)}
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
      {hint && (
        <p className="muted" style={{ marginTop: '-0.5rem' }}>
          {hint}
        </p>
      )}
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
