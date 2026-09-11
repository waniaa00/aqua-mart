import { useState } from 'react';
import Icon from '../components/Icon.jsx';

const HOURS = [
  ['Mon – Fri', '10:00 AM – 7:00 PM'],
  ['Saturday', '10:00 AM – 6:00 PM'],
  ['Sunday', '11:00 AM – 4:00 PM'],
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', topic: 'General Question', message: '' });
  const [sent, setSent] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Prototype only - no backend to send this to yet. Just confirm receipt
    // locally so the flow feels complete for now.
    setSent(true);
  }

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-inline">
          <span className="eyebrow">Contact</span>
          <h1>Questions, custom orders, or just tank talk</h1>
          <p className="lede">Reach out about a specific fish, a setup you're planning, or anything else — we read every message.</p>
        </div>

        <div className="contact-grid">
          <div className="card card-pad">
            {sent ? (
              <div className="contact-success">
                <span className="value-icon">
                  <Icon name="check" size={36} />
                </span>
                <h3>Message received</h3>
                <p className="muted">
                  Thanks, {form.name.split(' ')[0] || 'friend'} — we'll get back to you at {form.email || 'your email'} within one
                  business day.
                </p>
                <button className="btn btn-outline" onClick={() => setSent(false)}>
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="grid grid-2">
                  <div className="field">
                    <label htmlFor="name">Name</label>
                    <input id="name" name="name" className="input" required value={form.name} onChange={handleChange} />
                  </div>
                  <div className="field">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" className="input" required value={form.email} onChange={handleChange} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="topic">Topic</label>
                  <select id="topic" name="topic" className="input" value={form.topic} onChange={handleChange}>
                    <option>General Question</option>
                    <option>Order / Delivery</option>
                    <option>Fish Health Concern</option>
                    <option>Custom Aquarium Request</option>
                    <option>Something Else</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="message">Message</label>
                  <textarea id="message" name="message" className="input" required value={form.message} onChange={handleChange} />
                </div>
                <button type="submit" className="btn btn-primary btn-block">
                  Send Message
                </button>
              </form>
            )}
          </div>

          <div>
            <div className="card card-pad contact-info-card">
              <h3>Visit the shop</h3>
              <p className="muted">412 Tidewater Lane, Harbor City</p>
              <h3>Call or email</h3>
              <p className="muted">(555) 019-2847 · hello@aquamart.example</p>
              <h3>Hours</h3>
              <table className="hours-table">
                <tbody>
                  {HOURS.map(([day, time]) => (
                    <tr key={day}>
                      <td>{day}</td>
                      <td className="muted">{time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
