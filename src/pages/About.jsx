import Icon from '../components/Icon.jsx';

const VALUES = [
  { icon: 'heart-pulse', title: 'Fish Health First', body: 'Every animal is quarantined and health-checked before it ever reaches the sales floor.' },
  { icon: 'graduation', title: 'We Teach, Not Just Sell', body: 'Every purchase comes with real husbandry advice — we\'d rather you succeed than restock.' },
  { icon: 'waves', title: 'Sustainable Sourcing', body: 'Captive-bred stock wherever possible, and no listings for species with poor survivability in home aquaria.' },
  { icon: 'wrench', title: 'We Show Up', body: 'Setup, cleaning, and maintenance aren\'t upsells here — they\'re half the business.' },
];

const TEAM = [
  { name: 'Wania A.', role: 'Founder & Aquascaper' },
  { name: 'Marcus O.', role: 'Marine Fish Specialist' },
  { name: 'Priya S.', role: 'In-House Fish Vet' },
  { name: 'Dev K.', role: 'Setup & Maintenance Lead' },
];

export default function About() {
  return (
    <>
      <section className="section page-hero">
        <div className="container">
          <span className="eyebrow">About Us</span>
          <h1>Built by people who actually keep tanks</h1>
          <p className="lede">
            Aqua Mart started as one overcrowded fish room and grew into a full aquarium shop because too
            many good fish were being sold into setups that couldn't support them. We'd rather talk you out of the wrong
            tank than sell it to you.
          </p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container grid grid-2 about-story">
          <div>
            <h2>Our story</h2>
            <p>
              What began as a hobbyist's spare room bred fish and a serious aquascaping habit turned into requests from
              friends, then friends-of-friends, for advice, livestock, and eventually — because so many people wanted a
              tank set up and didn't know where to start — hands-on help.
            </p>
            <p>
              Today that's the whole model: a real shop floor of healthy, well-sourced livestock and equipment, backed by
              a services team that will come to your home and do the parts most people find intimidating, from a first
              setup to full aquascaping.
            </p>
          </div>
          <div>
            <h2>What we believe</h2>
            <div className="value-list">
              {VALUES.map((v) => (
                <div key={v.title} className="value-item">
                  <span className="value-icon">
                    <Icon name={v.icon} size={24} />
                  </span>
                  <div>
                    <strong>{v.title}</strong>
                    <p className="muted">{v.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">The Team</span>
              <h2>Who you'll actually talk to</h2>
            </div>
          </div>
          <div className="grid grid-4">
            {TEAM.map((member) => (
              <div key={member.name} className="card card-pad team-card">
                <span className="team-avatar">
                  <Icon name="user" size={36} />
                </span>
                <strong>{member.name}</strong>
                <span className="muted">{member.role}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
