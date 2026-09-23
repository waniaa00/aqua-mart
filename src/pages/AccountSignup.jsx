import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { ApiError } from '../api/client.js';

export default function AccountSignup() {
  const { isAuthenticated, register } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={location.state?.from ?? '/account'} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate(location.state?.from ?? '/account', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('An account with that email already exists.');
      } else {
        setError('Could not create your account. Please check your details and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section container" style={{ maxWidth: '24rem' }}>
      <h1>Create an Account</h1>
      <form className="card card-pad" onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <div className="field">
          <label htmlFor="signup-name">Name</label>
          <input id="signup-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            className="input"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            className="input"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="muted" style={{ marginTop: '0.4rem', marginBottom: 0, fontSize: '0.8rem' }}>
            At least 8 characters.
          </p>
        </div>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create Account'}
        </button>
        <p className="muted" style={{ marginTop: '1rem', marginBottom: 0 }}>
          Already have an account? <Link to="/account/login">Log in</Link>
        </p>
      </form>
    </section>
  );
}
