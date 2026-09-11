import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

export default function NotFound() {
  return (
    <section className="section container" style={{ textAlign: 'center' }}>
      <span style={{ display: 'inline-flex', color: 'var(--accent)' }}>
        <Icon name="fish" size={56} />
      </span>
      <h1>This one got away</h1>
      <p className="muted">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary">
        Back to Home
      </Link>
    </section>
  );
}
