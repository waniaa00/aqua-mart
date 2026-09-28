import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import OrderDetailDrawer from '../components/OrderDetailDrawer.jsx';
import AppointmentDetailDrawer from '../components/AppointmentDetailDrawer.jsx';
import ActivityFeed from '../components/ActivityFeed.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useCurrency, CURRENCIES } from '../context/CurrencyContext.jsx';
import { createAddress, deleteAddress, fetchAddresses, setDefaultAddress, updateAddress, updateProfile } from '../api/account.js';
import { fetchOrders } from '../api/orders.js';
import { fetchAppointments } from '../api/appointments.js';
import { fetchWishlist } from '../api/wishlist.js';

const EMPTY_ADDRESS = {
  full_name: '',
  phone: '',
  address_line: '',
  city: '',
  state_province: '',
  postal_code: '',
  country: '',
  delivery_instructions: '',
};

const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'processing', 'ready_for_delivery', 'out_for_delivery']);

const ORDER_STATUS_BADGE = {
  completed: 'badge-success',
  confirmed: 'badge-success',
  cancelled: 'badge-coral',
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// US1 — Customer dashboard overview: KPI tiles (FR-005), recent
// orders/upcoming appointment (FR-006/FR-008), and the profile/address
// management absorbed from the retired Account.jsx (T020). Order and
// appointment counts are derived client-side from a single up-to-100-item
// fetch — the backend has no dedicated per-customer status-count endpoint,
// and 100 (the backend's max page size) comfortably covers this app's
// scale (constitution §34).
export default function Dashboard() {
  const { token, user, updateUser } = useCustomerAuth();
  const { format, currency } = useCurrency();

  const [profileForm, setProfileForm] = useState({ name: '', preferred_currency: 'USD' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [addressStatus, setAddressStatus] = useState('loading');
  const [addressForm, setAddressForm] = useState(null);

  const [orders, setOrders] = useState([]);
  const [orderStatus, setOrderStatus] = useState('loading');

  const [appointments, setAppointments] = useState([]);
  const [appointmentStatus, setAppointmentStatus] = useState('loading');

  const [wishlistCount, setWishlistCount] = useState(0);
  const [wishlistStatus, setWishlistStatus] = useState('loading');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    if (user) setProfileForm({ name: user.name, preferred_currency: user.preferred_currency });
  }, [user]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchAddresses(token)
      .then((res) => !cancelled && (setAddresses(res), setAddressStatus('ready')))
      .catch(() => !cancelled && setAddressStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setOrderStatus('loading');
    fetchOrders(token, { limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setOrders(res.items);
        setOrderStatus('ready');
      })
      .catch(() => !cancelled && setOrderStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setAppointmentStatus('loading');
    fetchAppointments(token)
      .then((res) => {
        if (cancelled) return;
        setAppointments(res);
        setAppointmentStatus('ready');
      })
      .catch(() => !cancelled && setAppointmentStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setWishlistStatus('loading');
    fetchWishlist(token)
      .then((res) => {
        if (cancelled) return;
        setWishlistCount(res.length);
        setWishlistStatus('ready');
      })
      .catch(() => !cancelled && setWishlistStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const orderCounts = useMemo(() => {
    const total = orders.length;
    const active = orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;
    const completed = orders.filter((o) => o.status === 'completed').length;
    return { total, active, completed };
  }, [orders]);

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.placed_at) - new Date(a.placed_at)).slice(0, 5),
    [orders]
  );

  const upcomingAppointment = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return appointments
      .filter((a) => a.status !== 'cancelled' && a.status !== 'completed' && a.date >= today)
      .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time))[0];
  }, [appointments]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateProfile(token, profileForm);
      updateUser(res);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch {
      // form keeps whatever the user typed so they can retry
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveAddress(e) {
    e.preventDefault();
    const { id, ...fields } = addressForm;
    const saved = id ? await updateAddress(token, id, fields) : await createAddress(token, fields);
    setAddresses((prev) => (id ? prev.map((a) => (a.id === id ? saved : a)) : [...prev, saved]));
    setAddressForm(null);
  }

  async function handleDeleteAddress(id) {
    await deleteAddress(token, id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSetDefault(id) {
    const updated = await setDefaultAddress(token, id);
    setAddresses((prev) => prev.map((a) => (a.id === id ? updated : { ...a, is_default: false })));
  }

  return (
    <section className="section" style={{ paddingTop: '2rem' }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1>Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
        </div>
      </div>

      <div className="dashboard-kpi-grid">
        <KpiTile
          icon="package"
          label="Total Orders"
          value={orderStatus === 'ready' ? orderCounts.total : null}
          status={orderStatus}
          onClick={() => scrollToSection('recent-orders')}
        />
        <KpiTile
          icon="truck"
          label="Active Orders"
          value={orderStatus === 'ready' ? orderCounts.active : null}
          status={orderStatus}
          onClick={() => scrollToSection('recent-orders')}
        />
        <KpiTile
          icon="check"
          label="Completed Orders"
          value={orderStatus === 'ready' ? orderCounts.completed : null}
          status={orderStatus}
          onClick={() => scrollToSection('recent-orders')}
        />
        <KpiTile
          icon="calendar"
          label="Upcoming Appointment"
          value={appointmentStatus === 'ready' ? (upcomingAppointment ? upcomingAppointment.service_name : 'None') : null}
          status={appointmentStatus}
          onClick={() => scrollToSection('upcoming-appointment')}
        />
        <KpiTile
          icon="heart"
          label="Wishlist"
          value={wishlistStatus === 'ready' ? wishlistCount : null}
          status={wishlistStatus}
          onClick={() => scrollToSection('wishlist-note')}
        />
        <KpiTile icon="store" label="Currency" value={currency} status="ready" />
      </div>

      <div className="grid grid-2" style={{ marginTop: '2rem', alignItems: 'start' }}>
        <div className="card card-pad" id="recent-orders">
          <h3 style={{ marginTop: 0 }}>Recent Orders</h3>
          {orderStatus === 'loading' && <p className="muted">Loading orders…</p>}
          {orderStatus === 'error' && <p className="muted">Couldn't load your orders right now.</p>}
          {orderStatus === 'ready' &&
            (recentOrders.length === 0 ? (
              <div>
                <p className="muted">No orders yet.</p>
                <a className="btn btn-outline btn-sm" href="/shop">
                  Browse Products
                </a>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {recentOrders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="dashboard-list-row"
                    style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}
                    onClick={() => setSelectedOrder(o)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge ${ORDER_STATUS_BADGE[o.status] ?? 'badge'}`}>{o.status}</span>
                      <span className="price">{format(o.total)}</span>
                    </div>
                    <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                      {o.items.map((i) => `${i.quantity}× ${i.product_name}`).join(', ')}
                    </p>
                    <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                      {formatDateTime(o.placed_at)}
                    </p>
                  </button>
                ))}
              </div>
            ))}
        </div>

        <div className="card card-pad" id="upcoming-appointment">
          <h3 style={{ marginTop: 0 }}>Upcoming Appointment</h3>
          {appointmentStatus === 'loading' && <p className="muted">Loading appointments…</p>}
          {appointmentStatus === 'error' && <p className="muted">Couldn't load appointments right now.</p>}
          {appointmentStatus === 'ready' &&
            (!upcomingAppointment ? (
              <div>
                <p className="muted">No upcoming appointments.</p>
                <a className="btn btn-outline btn-sm" href="/services">
                  Browse Services
                </a>
              </div>
            ) : (
              <button type="button" className="dashboard-list-row" onClick={() => setSelectedAppointment(upcomingAppointment)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{upcomingAppointment.service_name}</strong>
                  <span className="badge">{upcomingAppointment.status}</span>
                </div>
                <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                  {upcomingAppointment.date} · {upcomingAppointment.start_time}
                </p>
              </button>
            ))}
        </div>
      </div>

      <p id="wishlist-note" className="muted" style={{ marginTop: '2rem' }}>
        {wishlistStatus === 'ready' && (
          <>
            {wishlistCount} item{wishlistCount === 1 ? '' : 's'} saved —{' '}
            <a href="/dashboard/wishlist">view wishlist</a>
          </>
        )}
      </p>

      <div className="card card-pad" style={{ marginTop: '2rem' }}>
        <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
        <ActivityFeed
          orders={orders}
          appointments={appointments}
          orderStatus={orderStatus}
          appointmentStatus={appointmentStatus}
          onSelectOrder={setSelectedOrder}
          onSelectAppointment={setSelectedAppointment}
        />
      </div>

      <div className="grid grid-2" style={{ marginTop: '2rem', alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 style={{ marginTop: 0 }}>Profile</h3>
          <form onSubmit={handleSaveProfile}>
            <div className="field">
              <label htmlFor="profile-email">Email</label>
              <input id="profile-email" className="input" value={user?.email ?? ''} disabled />
            </div>
            <div className="field">
              <label htmlFor="profile-name">Name</label>
              <input
                id="profile-name"
                className="input"
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="profile-currency">Preferred Currency</label>
              <select
                id="profile-currency"
                className="input"
                value={profileForm.preferred_currency}
                onChange={(e) => setProfileForm((f) => ({ ...f, preferred_currency: e.target.value }))}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {profileSaved ? (
                <>
                  Saved <Icon name="check" size={14} />
                </>
              ) : savingProfile ? (
                'Saving…'
              ) : (
                'Save Changes'
              )}
            </button>
          </form>
        </div>

        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Addresses</h3>
            {!addressForm && (
              <button className="btn btn-outline btn-sm" onClick={() => setAddressForm({ ...EMPTY_ADDRESS })}>
                Add Address
              </button>
            )}
          </div>

          {addressForm && (
            <form onSubmit={handleSaveAddress} style={{ marginTop: '1rem' }}>
              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor="addr-name">Full Name</label>
                  <input
                    id="addr-name"
                    className="input"
                    required
                    value={addressForm.full_name}
                    onChange={(e) => setAddressForm((f) => ({ ...f, full_name: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="addr-phone">Phone</label>
                  <input
                    id="addr-phone"
                    className="input"
                    required
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="addr-line">Address</label>
                <input
                  id="addr-line"
                  className="input"
                  required
                  value={addressForm.address_line}
                  onChange={(e) => setAddressForm((f) => ({ ...f, address_line: e.target.value }))}
                />
              </div>
              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor="addr-city">City</label>
                  <input
                    id="addr-city"
                    className="input"
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="addr-postal">Postal Code</label>
                  <input
                    id="addr-postal"
                    className="input"
                    required
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm((f) => ({ ...f, postal_code: e.target.value }))}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="addr-country">Country</label>
                <input
                  id="addr-country"
                  className="input"
                  required
                  value={addressForm.country}
                  onChange={(e) => setAddressForm((f) => ({ ...f, country: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  {addressForm.id ? 'Save' : 'Add'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddressForm(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {addressStatus === 'loading' && <p className="muted">Loading addresses…</p>}
          {addressStatus === 'error' && <p className="muted">Couldn't load addresses.</p>}
          {addressStatus === 'ready' && !addressForm && (
            <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
              {addresses.length === 0 && <p className="muted">No saved addresses yet.</p>}
              {addresses.map((a) => (
                <div key={a.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong>{a.full_name}</strong>
                      {a.is_default && (
                        <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>
                          Default
                        </span>
                      )}
                      <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                        {a.address_line}, {a.city}, {a.postal_code}, {a.country}
                      </p>
                      <p className="muted" style={{ margin: 0 }}>
                        {a.phone}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      {!a.is_default && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleSetDefault(a.id)}>
                          Set Default
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => setAddressForm({ id: a.id, ...a })}>
                        Edit
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteAddress(a.id)} aria-label={`Delete ${a.full_name}`}>
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <OrderDetailDrawer order={selectedOrder} open={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} />
      <AppointmentDetailDrawer
        appointment={selectedAppointment}
        token={token}
        open={Boolean(selectedAppointment)}
        onClose={() => setSelectedAppointment(null)}
        onCancelled={(updated) => {
          setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          setSelectedAppointment(updated);
        }}
      />
    </section>
  );
}

function KpiTile({ icon, label, value, status, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className="card card-pad dashboard-kpi-tile" onClick={onClick} type={onClick ? 'button' : undefined}>
      <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
        <Icon name={icon} size={18} /> {label}
      </span>
      <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
        {status === 'loading' ? <span className="dashboard-kpi-skeleton" /> : status === 'error' ? '—' : value}
      </div>
    </Tag>
  );
}
