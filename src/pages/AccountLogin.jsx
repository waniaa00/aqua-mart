import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';

export default function AccountLogin() {
  const { isAuthenticated, login } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
      await login(email, password);
      navigate(location.state?.from ?? '/account', { replace: true });
    } catch {
      setError('Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section container" style={{ maxWidth: '24rem' }}>
      <h1>Log In</h1>
      <form className="card card-pad" onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <div className="field">
          <label htmlFor="account-email">Email</label>
          <input
            id="account-email"
            type="email"
            className="input"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="account-password">Password</label>
          <input
            id="account-password"
            type="password"
            className="input"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Log In'}
        </button>
        <p className="muted" style={{ marginTop: '1rem', marginBottom: 0 }}>
          New here? <Link to="/account/signup">Create an account</Link>
        </p>
      </form>
    </section>
  );
}
