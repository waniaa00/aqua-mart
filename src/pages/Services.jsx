import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { fetchServices } from '../api/services.js';

const LOCATION_ICON = {
  'home-visit': 'home',
  'in-store-or-call': 'store',
  delivery: 'truck',
};
const LOCATION_LABEL = {
  'home-visit': 'Home visit',
  'in-store-or-call': 'In-store or call',
  delivery: 'Delivery',
};

export default function Services() {
  const { format } = useCurrency();
  const [services, setServices] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  useEffect(() => {
    let cancelled = false;
    fetchServices()
      .then((res) => {
        if (!cancelled) {
          setServices(res);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-inline">
          <span className="eyebrow">Services</span>
          <h1>Book a professional, online</h1>
          <p className="lede">
            From a quick consultation to a full custom build, our team handles the parts of fishkeeping that are hardest
            to DIY — booked in a few steps, no phone tag required.
          </p>
        </div>

        {status === 'loading' && <p className="muted">Loading services…</p>}
        {status === 'error' && <p className="muted">Couldn't load services right now. Please try again shortly.</p>}

        {status === 'ready' && (
          <div className="grid grid-3 service-grid">
            {services.map((service) => (
              <div key={service.id} className="card card-pad service-card">
                {service.badge && <span className="badge badge-coral service-card-badge">{service.badge}</span>}
                <span className="service-card-icon">
                  <Icon name={service.icon} size={30} />
                </span>
                <h3>{service.name}</h3>
                <p className="muted service-card-summary">{service.summary}</p>
                <div className="service-card-meta">
                  <span className="tag">{service.duration}</span>
                  <span className="tag">
                    <Icon name={LOCATION_ICON[service.location]} size={13} /> {LOCATION_LABEL[service.location]}
                  </span>
                </div>
                <div className="service-card-footer">
                  <span className="price">
                    From {format(service.price)}
                    {service.priceNote ? ` ${service.priceNote}` : ''}
                  </span>
                  <Link to={`/services/${service.id}`} className="btn btn-primary btn-sm">
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
