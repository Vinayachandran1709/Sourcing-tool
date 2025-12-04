import React, { useState } from 'react';
import { Rocket, Sparkles, Zap, Users, Mail, Send, X, CheckCircle, Target, TrendingUp, Clock } from 'lucide-react';

const LandingPage = () => {
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [waitlistData, setWaitlistData] = useState({ name: '', company: '', email: '' });
  const [contactData, setContactData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/public/waitlist/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waitlistData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSubmitted(true);
        setTimeout(() => {
          setShowWaitlistModal(false);
          setSubmitted(false);
          setWaitlistData({ name: '', company: '', email: '' });
        }, 2500);
      }
    } catch (error) {
      alert('Failed to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/public/contact/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSubmitted(true);
        setTimeout(() => {
          setShowContactModal(false);
          setSubmitted(false);
          setContactData({ name: '', email: '', message: '' });
        }, 2500);
      }
    } catch (error) {
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* ANIMATED BACKGROUND */}
      <div style={styles.animatedBg}>
        <div style={styles.particle1}></div>
        <div style={styles.particle2}></div>
        <div style={styles.particle3}></div>
        <div style={styles.particle4}></div>
        <div style={styles.particle5}></div>
      </div>

      {/* HERO SECTION */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          {/* Floating Badge */}
          <div style={styles.floatingBadge}>
            <Sparkles size={18} />
            <span>Revolutionizing Developer Recruitment</span>
            <div style={styles.pulse}></div>
          </div>

          {/* Main Title with Gradient */}
          <h1 style={styles.mainTitle}>
            Find Your Next
            <br />
            <span style={styles.gradientText}>Superstar Developer</span>
            <br />
            In Minutes, Not Months
          </h1>

          {/* Subtitle */}
          <p style={styles.heroSubtitle}>
            AI-powered platform that instantly sources <strong>200+ qualified developers</strong> from GitHub,
            scores them intelligently, and sends <strong>personalized outreach emails</strong> that get 
            <span style={styles.highlight}> 45% response rates</span>. Stop manual recruiting. Start hiring.
          </p>

          {/* CTA Buttons */}
          <div style={styles.ctaGroup}>
            <button onClick={() => setShowWaitlistModal(true)} style={styles.primaryBtn}>
              <Rocket size={22} />
              <span>Join Beta Waitlist</span>
              <div style={styles.btnShine}></div>
            </button>
            <button onClick={() => setShowContactModal(true)} style={styles.secondaryBtn}>
              <Mail size={22} />
              <span>Contact Sales</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div style={styles.statsContainer}>
            <div style={styles.statBox}>
              <Target size={32} color="#fbbf24" />
              <div style={styles.statNumber}>200+</div>
              <div style={styles.statLabel}>Profiles Per Search</div>
            </div>
            <div style={styles.divider}></div>
            <div style={styles.statBox}>
              <TrendingUp size={32} color="#10b981" />
              <div style={styles.statNumber}>45%</div>
              <div style={styles.statLabel}>Response Rate</div>
            </div>
            <div style={styles.divider}></div>
            <div style={styles.statBox}>
              <Clock size={32} color="#3b82f6" />
              <div style={styles.statNumber}>10x</div>
              <div style={styles.statLabel}>Faster Hiring</div>
            </div>
          </div>
        </div>
      </section>

      {/* VIDEO DEMO SECTION */}
      <section style={styles.videoSection}>
        <div style={styles.sectionHeader}>
          <Zap size={36} color="#fbbf24" />
          <h2 style={styles.sectionTitle}>See It In Action</h2>
          <p style={styles.sectionSubtitle}>Watch how companies hire developers in under 5 minutes</p>
        </div>

        <div style={styles.videoContainer}>
          <div style={styles.videoWrapper}>
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="Product Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={styles.iframe}
            ></iframe>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section style={styles.featuresSection}>
        <div style={styles.featuresGrid}>
          <div style={{...styles.featureCard, ...styles.featureCard1}}>
            <div style={styles.featureIcon}>
              <Users size={40} />
            </div>
            <h3 style={styles.featureTitle}>Smart GitHub Sourcing</h3>
            <p style={styles.featureText}>
              Fetch 200-300 developer profiles per search with intelligent pagination. 
              No more 30-profile GitHub API limits.
            </p>
          </div>

          <div style={{...styles.featureCard, ...styles.featureCard2}}>
            <div style={styles.featureIcon}>
              <Zap size={40} />
            </div>
            <h3 style={styles.featureTitle}>AI-Powered Scoring</h3>
            <p style={styles.featureText}>
              Automatic developer ranking (0-100) based on stars, repos, contributions, 
              activity, and tech stack diversity.
            </p>
          </div>

          <div style={{...styles.featureCard, ...styles.featureCard3}}>
            <div style={styles.featureIcon}>
              <Send size={40} />
            </div>
            <h3 style={styles.featureTitle}>Personalized Outreach</h3>
            <p style={styles.featureText}>
              Send bulk emails with {'{{name}}'} personalization. Achieve 45% response 
              rates vs 2-5% with generic emails.
            </p>
          </div>
        </div>
      </section>

      {/* WAITLIST MODAL */}
      {showWaitlistModal && (
        <div style={styles.modalOverlay} onClick={() => !loading && setShowWaitlistModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowWaitlistModal(false)} style={styles.closeBtn} disabled={loading}>
              <X size={24} />
            </button>

            {!submitted ? (
              <>
                <div style={styles.modalIcon}>
                  <Rocket size={56} color="#4f46e5" />
                </div>
                <h2 style={styles.modalTitle}>Join the Beta Revolution</h2>
                <p style={styles.modalSubtitle}>Be among the first to transform your developer hiring</p>

                <form onSubmit={handleWaitlistSubmit} style={styles.form}>
                  <input
                    type="text"
                    value={waitlistData.name}
                    onChange={(e) => setWaitlistData({...waitlistData, name: e.target.value})}
                    placeholder="Your Name"
                    style={styles.input}
                    required
                    disabled={loading}
                  />
                  <input
                    type="text"
                    value={waitlistData.company}
                    onChange={(e) => setWaitlistData({...waitlistData, company: e.target.value})}
                    placeholder="Company Name"
                    style={styles.input}
                    required
                    disabled={loading}
                  />
                  <input
                    type="email"
                    value={waitlistData.email}
                    onChange={(e) => setWaitlistData({...waitlistData, email: e.target.value})}
                    placeholder="Work Email"
                    style={styles.input}
                    required
                    disabled={loading}
                  />
                  <button type="submit" style={styles.submitBtn} disabled={loading}>
                    {loading ? 'Joining...' : (
                      <>
                        <Sparkles size={20} />
                        <span>Secure My Spot</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div style={styles.successState}>
                <CheckCircle size={72} color="#10b981" />
                <h3 style={styles.successTitle}>You're On The List!</h3>
                <p style={styles.successText}>
                  We'll notify you when beta opens. Get ready for lightning-fast hiring! ⚡
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTACT MODAL */}
      {showContactModal && (
        <div style={styles.modalOverlay} onClick={() => !loading && setShowContactModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowContactModal(false)} style={styles.closeBtn} disabled={loading}>
              <X size={24} />
            </button>

            {!submitted ? (
              <>
                <div style={styles.modalIcon}>
                  <Mail size={56} color="#10b981" />
                </div>
                <h2 style={styles.modalTitle}>Get In Touch</h2>
                <p style={styles.modalSubtitle}>Questions? Partnerships? Let's talk!</p>

                <form onSubmit={handleContactSubmit} style={styles.form}>
                  <input
                    type="text"
                    value={contactData.name}
                    onChange={(e) => setContactData({...contactData, name: e.target.value})}
                    placeholder="Your Name"
                    style={styles.input}
                    required
                    disabled={loading}
                  />
                  <input
                    type="email"
                    value={contactData.email}
                    onChange={(e) => setContactData({...contactData, email: e.target.value})}
                    placeholder="Your Email"
                    style={styles.input}
                    required
                    disabled={loading}
                  />
                  <textarea
                    value={contactData.message}
                    onChange={(e) => setContactData({...contactData, message: e.target.value})}
                    placeholder="Tell us what you're looking for..."
                    style={{...styles.input, minHeight: '120px', resize: 'vertical'}}
                    required
                    disabled={loading}
                  />
                  <button type="submit" style={styles.submitBtn} disabled={loading}>
                    {loading ? 'Sending...' : (
                      <>
                        <Send size={20} />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div style={styles.successState}>
                <CheckCircle size={72} color="#10b981" />
                <h3 style={styles.successTitle}>Message Sent!</h3>
                <p style={styles.successText}>
                  We'll get back to you within 24 hours. Thanks for reaching out! 🚀
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerBrand}>
            <Rocket size={32} />
            <span>DevSourcer</span>
          </div>
          <p style={styles.footerText}>© 2025 DevSourcer. Revolutionizing developer recruitment.</p>
        </div>
      </footer>
    </div>
  );
};

// STYLES
const styles = {
  page: {
    fontFamily: 'Arial, sans-serif',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    position: 'relative',
    overflow: 'hidden',
  },

  // Animated Background
  animatedBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    pointerEvents: 'none',
  },

  particle1: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
    top: '10%',
    left: '5%',
    animation: 'float 20s ease-in-out infinite',
  },

  particle2: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
    top: '50%',
    right: '10%',
    animation: 'float 15s ease-in-out infinite 5s',
  },

  particle3: {
    position: 'absolute',
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
    bottom: '20%',
    left: '15%',
    animation: 'float 18s ease-in-out infinite 10s',
  },

  particle4: {
    position: 'absolute',
    width: '250px',
    height: '250px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
    top: '30%',
    right: '30%',
    animation: 'float 22s ease-in-out infinite 2s',
  },

  particle5: {
    position: 'absolute',
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)',
    bottom: '30%',
    right: '20%',
    animation: 'float 16s ease-in-out infinite 8s',
  },

  // Hero Section
  hero: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 2rem',
    zIndex: 10,
  },

  heroContent: {
    maxWidth: '1000px',
    textAlign: 'center',
    color: '#fff',
  },

  floatingBadge: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 28px',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(12px)',
    borderRadius: '50px',
    border: '2px solid rgba(255,255,255,0.3)',
    fontSize: '15px',
    fontWeight: '700',
    marginBottom: '2.5rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  },

  pulse: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '50px',
    border: '2px solid rgba(255,255,255,0.5)',
    animation: 'pulse 2s ease-out infinite',
  },

  mainTitle: {
    fontSize: 'clamp(2.5rem, 6vw, 5rem)',
    fontWeight: '900',
    lineHeight: '1.1',
    marginBottom: '2rem',
    textShadow: '0 4px 30px rgba(0,0,0,0.3)',
  },

  gradientText: {
    background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundSize: '200% auto',
    animation: 'shimmer 3s linear infinite',
  },

  heroSubtitle: {
    fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
    lineHeight: '1.8',
    marginBottom: '3rem',
    color: 'rgba(255,255,255,0.95)',
    maxWidth: '800px',
    margin: '0 auto 3rem',
  },

  highlight: {
    color: '#fbbf24',
    fontWeight: '700',
  },

  ctaGroup: {
    display: 'flex',
    gap: '1.5rem',
    justifyContent: 'center',
    marginBottom: '4rem',
    flexWrap: 'wrap',
  },

  primaryBtn: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px 44px',
    fontSize: '1.2rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    color: '#000',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 12px 40px rgba(251,191,36,0.4)',
    overflow: 'hidden',
  },

  btnShine: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
    animation: 'shine 3s ease-in-out infinite',
  },

  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px 44px',
    fontSize: '1.2rem',
    fontWeight: '800',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    border: '3px solid rgba(255,255,255,0.3)',
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },

  statsContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3rem',
    padding: '2.5rem',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(12px)',
    borderRadius: '24px',
    border: '2px solid rgba(255,255,255,0.2)',
    flexWrap: 'wrap',
  },

  statBox: {
    textAlign: 'center',
  },

  statNumber: {
    fontSize: '3rem',
    fontWeight: '900',
    color: '#fbbf24',
    marginTop: '0.5rem',
  },

  statLabel: {
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginTop: '0.5rem',
  },

  divider: {
    width: '2px',
    height: '80px',
    background: 'rgba(255,255,255,0.3)',
  },

  // Video Section
  videoSection: {
    padding: '6rem 2rem',
    background: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(20px)',
  },

  sectionHeader: {
    textAlign: 'center',
    marginBottom: '3rem',
    color: '#fff',
  },

  sectionTitle: {
    fontSize: 'clamp(2rem, 4vw, 3.5rem)',
    fontWeight: '900',
    marginTop: '1rem',
    marginBottom: '1rem',
  },

  sectionSubtitle: {
    fontSize: '1.2rem',
    color: 'rgba(255,255,255,0.8)',
  },

  videoContainer: {
    maxWidth: '1100px',
    margin: '0 auto',
  },

  videoWrapper: {
    position: 'relative',
    paddingBottom: '56.25%',
    height: 0,
    overflow: 'hidden',
    borderRadius: '28px',
    boxShadow: '0 25px 70px rgba(0,0,0,0.5)',
  },

  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '28px',
  },

  // Features Section
  featuresSection: {
    padding: '6rem 2rem',
  },

  featuresGrid: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '2.5rem',
  },

  featureCard: {
    padding: '3rem',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(12px)',
    borderRadius: '28px',
    border: '2px solid rgba(255,255,255,0.2)',
    transition: 'all 0.4s ease',
    cursor: 'pointer',
  },

  featureCard1: {
    borderColor: 'rgba(59,130,246,0.5)',
  },

  featureCard2: {
    borderColor: 'rgba(251,191,36,0.5)',
  },

  featureCard3: {
    borderColor: 'rgba(16,185,129,0.5)',
  },

  featureIcon: {
    width: '90px',
    height: '90px',
    borderRadius: '22px',
    background: 'rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
    color: '#fff',
  },

  featureTitle: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#fff',
    marginBottom: '1rem',
  },

  featureText: {
    fontSize: '1.05rem',
    lineHeight: '1.7',
    color: 'rgba(255,255,255,0.85)',
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '2rem',
  },

  modal: {
    position: 'relative',
    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    borderRadius: '32px',
    padding: '3.5rem',
    maxWidth: '550px',
    width: '100%',
    border: '3px solid rgba(251,191,36,0.3)',
    boxShadow: '0 30px 100px rgba(0,0,0,0.6)',
  },

  closeBtn: {
    position: 'absolute',
    top: '1.5rem',
    right: '1.5rem',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '50%',
    width: '45px',
    height: '45px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#fff',
    transition: 'all 0.2s',
  },

  modalIcon: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },

  modalTitle: {
    fontSize: '2.2rem',
    fontWeight: '900',
    color: '#fbbf24',
    textAlign: 'center',
    marginBottom: '0.75rem',
  },

  modalSubtitle: {
    fontSize: '1.05rem',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: '2rem',
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },

  input: {
    width: '100%',
    padding: '18px 24px',
    fontSize: '1.05rem',
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(251,191,36,0.3)',
    borderRadius: '16px',
    color: '#fff',
    transition: 'all 0.3s',
    fontFamily: 'Arial, sans-serif',
  },

  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '20px',
    fontSize: '1.15rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    color: '#000',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '1rem',
  },

  successState: {
    textAlign: 'center',
    padding: '2rem 0',
  },

  successTitle: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#10b981',
    margin: '1.5rem 0 1rem',
  },

  successText: {
    fontSize: '1.15rem',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: '1.6',
  },

  // Footer
  footer: {
    padding: '3rem 2rem',
    background: 'rgba(0,0,0,0.3)',
    borderTop: '2px solid rgba(251,191,36,0.2)',
  },

  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    textAlign: 'center',
    color: '#fff',
  },

  footerBrand: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '1.6rem',
    fontWeight: '900',
    marginBottom: '1rem',
  },

  footerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.95rem',
  },
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-30px) rotate(5deg); }
  }

  @keyframes shimmer {
    to { background-position: 200% center; }
  }

  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  @keyframes shine {
    0% { left: -100%; }
    100% { left: 200%; }
  }

  button:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 50px rgba(251,191,36,0.5);
  }

  .featureCard:hover {
    transform: translateY(-10px);
    box-shadow: 0 25px 60px rgba(0,0,0,0.4);
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: #fbbf24;
    box-shadow: 0 0 0 3px rgba(251,191,36,0.1);
  }

  @media (max-width: 768px) {
    .statsContainer {
      flex-direction: column;
      gap: 2rem !important;
    }
    
    .divider {
      width: 80%;
      height: 2px;
    }
  }
`;
document.head.appendChild(styleSheet);

export default LandingPage;