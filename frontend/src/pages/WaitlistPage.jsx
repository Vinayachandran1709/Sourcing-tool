import React, { useMemo, useState } from 'react';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

const valuePoints = [
  {
    icon: '⬢',
    iconColor: '#FF7A45',
    text: "High-paying startup roles you won't find on Naukri or LinkedIn",
  },
  {
    icon: '↗',
    iconColor: '#FFD166',
    text: 'Direct intro to the hiring manager - zero applications, zero ghosting',
  },
  {
    icon: '✦',
    iconColor: '#7CE2FF',
    text: 'Aria negotiates your salary so you never leave money on the table',
  },
];

const WaitlistPage = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const normalizedName = name.trim();
  const normalizedPhone = phone.trim();

  const phoneDigitCount = useMemo(
    () => normalizedPhone.replace(/\D/g, '').length,
    [normalizedPhone]
  );

  const validate = () => {
    if (!normalizedName) {
      return 'Please enter your full name.';
    }

    if (!normalizedPhone) {
      return 'Please enter your WhatsApp number.';
    }

    if (!/^[+\-\s\d]+$/.test(normalizedPhone) || phoneDigitCount < 8) {
      return 'Please enter a valid WhatsApp number.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/waitlist/candidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: normalizedName,
          phone: normalizedPhone,
          source: 'homepage_waitlist',
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error('Request failed');
      }

      setSuccess(true);
      setName('');
      setPhone('');
    } catch (submitError) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlowPrimary} aria-hidden="true" />
      <div style={styles.backgroundGlowSecondary} aria-hidden="true" />

      <header style={styles.header}>
        <div style={styles.brandRow}>
          <span style={styles.brandWordmark}>TALENTBOX</span>
          <span style={styles.brandDot} />
        </div>

        <div style={styles.headerPill}>
          <span aria-hidden="true">🔒</span>
          <span>Private Beta</span>
        </div>
      </header>

      <main style={styles.heroSection}>
        <div style={styles.siteWidth} className="site-width">
          <div style={styles.heroGrid} className="hero-grid">
            <div style={styles.leftColumn}>
              <div style={styles.badge}>PRIVATE BETA</div>

              <h1 style={styles.headline}>
                <span style={styles.headlineLine}>Land your Dream</span>
                <span style={styles.headlineLine}>Tech job at India&apos;s</span>
                <span style={styles.headlineAccentLine}>best funded startups.</span>
              </h1>

              <p style={styles.subheadline}>
                Talk to Aria - your personal AI career agent. Tell her what you&apos;re looking
                for, and she connects you directly with hiring managers at India&apos;s best funded
                startups.
              </p>

              <div style={styles.valueList} className="value-list">
                {valuePoints.map((item) => (
                  <div key={item.text} style={styles.valueItem}>
                    <span style={styles.valueIcon} aria-hidden="true">
                      <span style={{ ...styles.valueIconGlyph, color: item.iconColor }}>{item.icon}</span>
                    </span>
                    <span style={styles.valueText}>{item.text}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 28px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {['#FF6B35', '#4A90D9', '#7B68EE', '#50C878', '#FF69B4'].map((color, i) => (
                    <div
                      key={i}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: '2px solid #0a0a0a',
                        marginLeft: i === 0 ? '0' : '-10px',
                        zIndex: 5 - i,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#fff',
                      }}
                    >
                      {['A', 'R', 'S', 'K', 'P'][i]}
                    </div>
                  ))}
                </div>
                <span
                  style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: '500',
                  }}
                >
                  500+ developers already joined the waitlist
                </span>
              </div>
            </div>

            <div style={styles.rightColumn}>
              <section style={styles.formCard}>
                {!success ? (
                  <>
                    <div style={styles.formHeader}>
                      <h2 style={styles.formTitle}>Join the private beta</h2>
                      <p style={styles.formSubtitle}>
                        <span style={styles.formSubtitleHighlight}>No charges for candidates.</span>
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} style={styles.form}>
                      <label style={styles.label}>
                        <span style={styles.labelText}>Full name</span>
                        <input
                          type="text"
                          name="name"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Aarav Sharma"
                          autoComplete="name"
                          style={styles.input}
                          disabled={loading}
                        />
                      </label>

                      <label style={styles.label}>
                        <span style={styles.labelText}>WhatsApp number</span>
                        <input
                          type="tel"
                          name="phone"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="+91 98765 43210"
                          autoComplete="tel"
                          inputMode="tel"
                          style={styles.input}
                          disabled={loading}
                        />
                      </label>

                      <p
                        style={{
                          fontSize: '12px',
                          color: 'rgba(255,255,255,0.4)',
                          margin: '8px 0 16px',
                          textAlign: 'center',
                        }}
                      >
                        We&apos;ll send updates on WhatsApp only.
                      </p>

                      {error ? (
                        <div style={styles.errorBox} role="alert">
                          {error}
                        </div>
                      ) : null}

                      <button type="submit" style={styles.submitButton} disabled={loading}>
                        {loading ? 'Joining...' : 'Get Early Access →'}
                      </button>

                      <p style={styles.consentText}>
                        By joining, you agree to receive beta updates and job alerts from TalentBox
                        on WhatsApp.
                      </p>
                    </form>
                  </>
                ) : (
                  <div style={styles.successState}>
                    <div style={styles.successBadge}>You&apos;re in</div>
                    <h2 style={styles.successTitle}>You&apos;re on the list.</h2>
                    <p style={styles.successText}>
                      We&apos;ll reach out on WhatsApp when beta access opens.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }

          .value-list {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 768px) {
          .site-width {
            padding: 0 20px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0a0a0a',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    overflow: 'hidden',
    position: 'relative',
  },
  siteWidth: {
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 48px',
    boxSizing: 'border-box',
  },
  backgroundGlowPrimary: {
    position: 'absolute',
    top: '-10%',
    right: '-5%',
    width: '700px',
    height: '700px',
    borderRadius: '50%',
    background:
      'radial-gradient(circle, rgba(255,80,0,0.35) 0%, rgba(255,80,0,0.08) 50%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  backgroundGlowSecondary: {
    position: 'absolute',
    bottom: '0',
    left: '-5%',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,80,0,0.18) 0%, transparent 65%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 48px',
    position: 'relative',
    zIndex: 10,
    width: '100%',
    boxSizing: 'border-box',
  },
  brandRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  brandWordmark: {
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#ffffff',
  },
  brandDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#FF6B35',
    boxShadow: '0 0 16px rgba(255,107,53,0.7)',
  },
  headerPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.15)',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroSection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  heroGrid: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: '64px',
    alignItems: 'center',
    flex: 1,
    minHeight: 'calc(100vh - 200px)',
    position: 'relative',
    zIndex: 1,
    padding: '40px 0 20px',
  },
  leftColumn: {
    minWidth: 0,
  },
  rightColumn: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    border: '1px solid rgba(255,140,0,0.4)',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.12em',
    color: '#FF6B00',
    textTransform: 'uppercase',
    marginBottom: '20px',
  },
  headline: {
    fontFamily: "'Instrument Serif', serif",
    fontSize: 'clamp(42px, 5.5vw, 72px)',
    fontWeight: '400',
    lineHeight: '1.08',
    letterSpacing: '-0.02em',
    color: '#ffffff',
    margin: '0 0 24px 0',
    maxWidth: '740px',
  },
  headlineAccent: {
    color: '#FF5500',
    fontStyle: 'italic',
  },
  headlineLine: {
    display: 'block',
  },
  headlineAccentLine: {
    display: 'block',
    color: '#FF5500',
    fontStyle: 'italic',
  },
  subheadline: {
    fontSize: '16px',
    lineHeight: '1.65',
    color: 'rgba(255,255,255,0.65)',
    margin: '0 0 32px 0',
    fontWeight: '400',
    maxWidth: '480px',
  },
  valueList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    margin: '0 0 32px 0',
    listStyle: 'none',
    padding: 0,
  },
  valueItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  valueIcon: {
    fontSize: '20px',
    marginBottom: '4px',
    display: 'block',
    lineHeight: 1,
  },
  valueIconGlyph: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.04)',
    fontSize: '18px',
    fontWeight: '700',
  },
  valueText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: '1.4',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#161616',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '36px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(20px)',
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: '480px',
  },
  formHeader: {
    marginBottom: '28px',
  },
  formTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 6px 0',
  },
  formSubtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.55)',
    margin: '0 0 28px 0',
    lineHeight: '1.5',
  },
  formSubtitleHighlight: {
    color: '#FF5500',
    fontWeight: '700',
  },
  form: {
    display: 'grid',
    gap: '16px',
  },
  label: {
    display: 'grid',
    gap: '8px',
  },
  labelText: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    backgroundColor: '#1e1e1e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  errorBox: {
    padding: '0.8rem 0.95rem',
    borderRadius: '12px',
    border: '1px solid rgba(255,107,107,0.25)',
    background: 'rgba(255,107,107,0.08)',
    color: '#ffd0d0',
    fontSize: '0.92rem',
    lineHeight: 1.5,
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#FF5500',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    letterSpacing: '0.01em',
    marginTop: '4px',
  },
  consentText: {
    margin: 0,
    fontSize: '0.84rem',
    lineHeight: 1.65,
    color: 'rgba(204, 204, 209, 0.68)',
  },
  successState: {
    display: 'grid',
    gap: '1rem',
    minHeight: '360px',
    alignContent: 'center',
  },
  successBadge: {
    display: 'inline-flex',
    width: 'fit-content',
    padding: '0.45rem 0.8rem',
    borderRadius: '999px',
    background: 'rgba(255,107,53,0.12)',
    border: '1px solid rgba(255,107,53,0.22)',
    color: '#ffc4b0',
    fontSize: '0.82rem',
    fontWeight: '700',
    letterSpacing: '0.02em',
  },
  successTitle: {
    margin: 0,
    fontSize: '2rem',
    lineHeight: 1.04,
    letterSpacing: '-0.03em',
    color: '#ffffff',
  },
  successText: {
    margin: 0,
    fontSize: '1rem',
    lineHeight: 1.75,
    color: 'rgba(228,228,232,0.78)',
    maxWidth: '32ch',
  },
};

export default WaitlistPage;
