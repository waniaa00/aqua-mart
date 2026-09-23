import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useCurrency, CURRENCIES } from '../context/CurrencyContext.jsx';
import { createAddress, deleteAddress, fetchAddresses, setDefaultAddress, updateAddress, updateProfile } from '../api/account.js';
import { fetchOrders } from '../api/orders.js';

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

const ORDER_STATUS_BADGE = {
  completed: 'badge-success',
  confirmed: 'badge-success',
  cancelled: 'badge-coral',
};

export default function Account() {
  const { isAuthenticated, ready, token, user, logout, updateUser } = useCustomerAuth();
  const location = useLocation();
  const { format } = useCurrency();

  const [profileForm, setProfileForm] = useState({ name: '', preferred_currency: 'USD' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [addressStatus, setAddressStatus] = useState('loading');
  const [addressForm, setAddressForm] = useState(null); // { id?: string, ...fields } or null when closed

  const [orders, setOrders] = useState([]);
  const [orderStatus, setOrderStatus] = useState('loading');

  useEffect(() => {
    if (user) setProfileForm({ name: user.name, preferred_currency: user.preferred_currency });
  }, [user]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchAddresses(token)
      .then((res) => {
        if (!cancelled) {
          setAddresses(res);
          setAddressStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setAddressStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchOrders(token)
      .then((res) => {
        if (!cancelled) {
          setOrders(res.items);
          setOrderStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setOrderStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!ready) {
    return (
      <section className="section container">
        <p className="muted">Loading account…</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/account/login" replace state={{ from: location.pathname }} />;
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateProfile(token, profileForm);
      updateUser(res);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch {
      // form stays as-is; the fields keep whatever the user typed so they can retry
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
    <section className="section container">
      <div className="section-head">
        <div>
          <span className="eyebrow">Account</span>
          <h1>{user?.name ?? 'My Account'}</h1>
        </div>
        <button className="btn btn-outline" onClick={logout}>
          Log Out
        </button>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '2rem', alignItems: 'start' }}>
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

      <div className="card card-pad">
        <h3 style={{ marginTop: 0 }}>Order History</h3>
        {orderStatus === 'loading' && <p className="muted">Loading orders…</p>}
        {orderStatus === 'error' && <p className="muted">Couldn't load your orders right now.</p>}
        {orderStatus === 'ready' &&
          (orders.length === 0 ? (
            <p className="muted">No orders yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {orders.map((o) => (
                <div key={o.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge ${ORDER_STATUS_BADGE[o.status] ?? 'badge'}`}>{o.status}</span>
                    <span className="price">{format(o.total)}</span>
                  </div>
                  <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                    {o.items.map((i) => `${i.quantity}× ${i.product_name}`).join(', ')}
                  </p>
                  <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                    {new Date(o.placed_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              ))}
            </div>
          ))}
      </div>
    </section>
  );
}
