import React, { useState, useEffect } from 'react';
import { Package, Sparkles, Mail, Send, X, CheckCircle, Target, TrendingUp, Layers } from 'lucide-react';

const LandingPage = () => {
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [waitlistData, setWaitlistData] = useState({ name: '', company: '', email: '' });
  const [contactData, setContactData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Typing animation state
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const words = ['Faster', 'Better', 'Easier'];

  // Typing animation effect
  useEffect(() => {
    const typingSpeed = isDeleting ? 50 : 100;
    const pauseDuration = 2000;

    const handleTyping = () => {
      const currentWord = words[currentWordIndex];

      if (!isDeleting) {
        // Typing forward
        if (currentText.length < currentWord.length) {
          setCurrentText(currentWord.substring(0, currentText.length + 1));
        } else {
          // Finished typing, wait then start deleting
          setTimeout(() => setIsDeleting(true), pauseDuration);
        }
      } else {
        // Deleting
        if (currentText.length > 0) {
          setCurrentText(currentText.substring(0, currentText.length - 1));
        } else {
          // Finished deleting, move to next word
          setIsDeleting(false);
          setCurrentWordIndex((prevIndex) => (prevIndex + 1) % words.length);
        }
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIndex, words]);

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
        }, 1200);
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
        }, 1200);
      }
    } catch (error) {
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* WAVE BACKGROUND */}
      <div style={styles.waveContainer}>
        <svg style={styles.wave} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
          <path fill="#f0f7ff" fillOpacity="0.4" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,149.3C960,160,1056,160,1152,138.7C1248,117,1344,75,1392,53.3L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
        <svg style={styles.wave2} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
          <path fill="#e6f2ff" fillOpacity="0.3" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,234.7C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      {/* TOP HEADER WITH LOGO */}
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <div style={styles.logoSection}>
            <Package size={32} color="#FF6B35" />
            <span style={styles.logoText}>TalentBox</span>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          {/* Top Badge with animated border */}
          <div style={styles.topBadge}>
            <div style={styles.animatedBorder}></div>
            <div style={styles.badgeContent}>
              <Sparkles size={18} color="#FF6B35" />
              <span>Building the future of full-stack talent sourcing – starting with developers.</span>
            </div>
          </div>

          {/* Main Headline with Typing Animation */}
          <h1 style={styles.mainTitle}>
            <span style={styles.staticText}>Find the Right Developers </span>
            <span style={styles.animatedWordContainer}>
              <span style={styles.animatedWord}>
                {currentText}
                <span style={styles.cursor}>|</span>
              </span>
            </span>
            <br />
            <span style={styles.staticText}>Before Your Competitors Do</span>
          </h1>

          {/* Subheadline */}
          <p style={styles.heroSubtitle}>
            Instantly match with developers who fit your exact needs, validate their expertise 
            with AI-powered scoring and specialization insights, and send personalized outreach 
            that gets replies.
          </p>

          {/* CTA Buttons */}
          <div style={styles.ctaGroup}>
            <button onClick={() => setShowWaitlistModal(true)} style={styles.primaryBtn}>
              <Package size={20} />
              <span>Join Beta Waitlist</span>
            </button>
            <button onClick={() => setShowContactModal(true)} style={styles.secondaryBtn}>
              <Mail size={20} />
              <span>Contact Us</span>
            </button>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section style={styles.statsSection}>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <Target size={36} color="#FF6B35" />
            </div>
            <h3 style={styles.statTitle}>AI-Powered Developer Scoring</h3>
            <p style={styles.statText}>
              Instantly evaluate real skill levels with AI-generated developer scores.
            </p>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <TrendingUp size={36} color="#FF6B35" />
            </div>
            <h3 style={styles.statTitle}>60%+ Reply Rate on Outreach</h3>
            <p style={styles.statText}>
              Personalized, targeted emails that get real engagement.
            </p>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <Layers size={36} color="#FF6B35" />
            </div>
            <h3 style={styles.statTitle}>Search by Specialization</h3>
            <p style={styles.statText}>
              Find developers by niche skills, stacks, and tech focus in seconds.
            </p>
          </div>
        </div>
      </section>

      {/* VIDEO DEMO SECTION */}
      <section style={styles.videoSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>See It In Action</h2>
          <p style={styles.sectionSubtitle}>
            Watch how modern teams cut through noise and source<br />
            the right developers in just a few steps.
          </p>
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
          <div style={styles.featureCard}>
            <div style={styles.featureNumber}>1</div>
            <h3 style={styles.featureTitle}>Smarter Talent Discovery</h3>
            <p style={styles.featureText}>
              Find high-fit developers based on skills, specialization, location, and real 
              activity signals – all in one powerful search workflow.
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureNumber}>2</div>
            <h3 style={styles.featureTitle}>Intelligent Developer Scoring</h3>
            <p style={styles.featureText}>
              Instantly understand developer quality with automated 0–100 scoring built on 
              contributions, repos, stars, consistency, and tech stack depth.
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureNumber}>3</div>
            <h3 style={styles.featureTitle}>High-Conversion Outreach</h3>
            <p style={styles.featureText}>
              Send personalized, targeted messages at scale and see significantly higher 
              response rates than traditional cold outreach.
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
                  <Package size={56} color="#FF6B35" />
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
                  <Mail size={56} color="#FF6B35" />
                </div>
                <h2 style={styles.modalTitle}>Get In Touch</h2>
                <p style={styles.modalSubtitle}>
                  Got a question, request, or requirement? Write to us – we'll get back within 2 hours.
                </p>

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
                    placeholder="Write your message here"
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
                  We'll get back to you within 2 hours. Thanks for reaching out! 🚀
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
            <Package size={32} />
            <span>TalentBox</span>
          </div>
          <p style={styles.footerText}>© 2025 TalentBox. Revolutionizing developer recruitment.</p>
        </div>
      </footer>
    </div>
  );
};

// ========================================
// STYLES WITH TYPING ANIMATION
// ========================================

const styles = {
  page: {
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 50%, #f0f7ff 100%)',
    position: 'relative',
    overflow: 'hidden',
  },

  // Wave background decoration
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
  },

  wave: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 'auto',
    opacity: 0.7,
  },

  wave2: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 'auto',
    opacity: 0.5,
  },

  // Header with logo
  header: {
    position: 'relative',
    zIndex: 100,
    padding: '1.5rem 2rem',
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
  },

  headerContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
  },

  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  logoText: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: '-0.02em',
  },

  // Hero Section
  hero: {
    position: 'relative',
    minHeight: '85vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 2rem 2rem',
    zIndex: 10,
  },

  heroContent: {
    maxWidth: '950px',
    textAlign: 'center',
  },

  // Animated badge with light running border
  topBadge: {
    position: 'relative',
    display: 'inline-block',
    marginBottom: '3rem',
  },

  animatedBorder: {
    position: 'absolute',
    top: '-2px',
    left: '-2px',
    right: '-2px',
    bottom: '-2px',
    borderRadius: '50px',
    background: 'linear-gradient(90deg, #FF6B35, #FFD700, #FF6B35, #FFD700)',
    backgroundSize: '350% 100%',  // Slightly wider (was 300%)
    animation: 'borderGlow 2.5s linear infinite',  // Slightly faster (was 3s)
    opacity: 0.75,  // Slightly more visible (was 0.6)
    zIndex: -1,
  },

  badgeContent: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 28px',
    background: '#fff',
    borderRadius: '50px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a1a',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },

  mainTitle: {
    fontSize: 'clamp(2.2rem, 5vw, 4rem)',
    fontWeight: '600',
    lineHeight: '1.2',
    marginBottom: '3rem',
    color: '#1a1a1a',
    letterSpacing: '-0.03em',
    maxWidth: '950px',
    margin: '0 auto 3rem',
    whiteSpace: 'normal',  // Added
    wordSpacing: 'normal',  // Added
  },

  // Animated typing word
  animatedWord: {
    fontFamily: "'Space Grotesk', 'Courier New', monospace",
    fontWeight: '700',
    color: '#FF6B35',
    display: 'inline-block',
    minWidth: '220px',  // Changed from 180px to 220px
    textAlign: 'left',
    verticalAlign: 'baseline',  // Added to prevent vertical shift
  },

  cursor: {
    display: 'inline-block',
    animation: 'blink 1s infinite',
    marginLeft: '2px',
  },

  heroSubtitle: {
    fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
    lineHeight: '1.7',
    color: '#4a4a4a',
    marginBottom: '2.5rem',
    maxWidth: '750px',
    margin: '0 auto 2.5rem',
    fontWeight: '400',
  },

  ctaGroup: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 36px',
    fontSize: '1.05rem',
    fontWeight: '600',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(255,107,53,0.3)',
  },

  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 36px',
    fontSize: '1.05rem',
    fontWeight: '600',
    background: '#fff',
    color: '#1a1a1a',
    border: '2px solid #e5e5e5',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },

  // Stats Section
  statsSection: {
    position: 'relative',
    zIndex: 10,
    padding: '4rem 2rem',
    background: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(0,0,0,0.06)',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
  },

  statsGrid: {
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2.5rem',
  },

  statCard: {
    textAlign: 'center',
    padding: '1.5rem',
  },

  statIcon: {
    width: '70px',
    height: '70px',
    margin: '0 auto 1.5rem',
    background: '#fff5f2',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(255,107,53,0.08)',
  },

  statTitle: {
    fontSize: '1.35rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '0.75rem',
    lineHeight: '1.3',
  },

  statText: {
    fontSize: '1rem',
    lineHeight: '1.6',
    color: '#666',
    fontWeight: '400',
  },

  // Video Section
  videoSection: {
    position: 'relative',
    zIndex: 10,
    padding: '5rem 2rem',
    background: 'transparent',
  },

  sectionHeader: {
    textAlign: 'center',
    marginBottom: '3rem',
  },

  sectionTitle: {
    fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
  },

  sectionSubtitle: {
    fontSize: '1.15rem',
    color: '#666',
    maxWidth: '700px',
    margin: '0 auto',
    lineHeight: '1.7',
  },

  videoContainer: {
    maxWidth: '1000px',
    margin: '0 auto',
  },

  videoWrapper: {
    position: 'relative',
    paddingBottom: '56.25%',
    height: 0,
    overflow: 'hidden',
    borderRadius: '18px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
    border: '1px solid rgba(0,0,0,0.08)',
    background: '#fff',
  },

  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '18px',
  },

  // Features Section
  featuresSection: {
    position: 'relative',
    zIndex: 10,
    padding: '5rem 2rem',
    background: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(10px)',
  },

  featuresGrid: {
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '2.5rem',
  },

  featureCard: {
    padding: '2.5rem',
    background: 'rgba(255,255,255,0.9)',
    borderRadius: '18px',
    border: '1px solid rgba(0,0,0,0.06)',
    transition: 'all 0.3s ease',
    position: 'relative',
    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
  },

  featureNumber: {
    width: '50px',
    height: '50px',
    borderRadius: '14px',
    background: '#FF6B35',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: '800',
    marginBottom: '1.5rem',
  },

  featureTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1rem',
    lineHeight: '1.3',
  },

  featureText: {
    fontSize: '1.05rem',
    lineHeight: '1.7',
    color: '#666',
    fontWeight: '400',
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '2rem',
  },

  modal: {
    position: 'relative',
    background: '#fff',
    borderRadius: '20px',
    padding: '3rem',
    maxWidth: '520px',
    width: '100%',
    boxShadow: '0 25px 80px rgba(0,0,0,0.15)',
    border: '1px solid #e5e5e5',
  },

  closeBtn: {
    position: 'absolute',
    top: '1.5rem',
    right: '1.5rem',
    background: '#f5f5f5',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#666',
    transition: 'all 0.2s',
  },

  modalIcon: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },

  modalTitle: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: '0.5rem',
  },

  modalSubtitle: {
    fontSize: '1rem',
    color: '#666',
    textAlign: 'center',
    marginBottom: '2rem',
    lineHeight: '1.5',
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },

  input: {
    width: '100%',
    padding: '14px 18px',
    fontSize: '1rem',
    background: '#fafafa',
    border: '1px solid #e5e5e5',
    borderRadius: '10px',
    color: '#1a1a1a',
    transition: 'all 0.3s',
    fontFamily: 'inherit',
  },

  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '16px',
    fontSize: '1.05rem',
    fontWeight: '600',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '0.5rem',
  },

  successState: {
    textAlign: 'center',
    padding: '2rem 0',
  },

  successTitle: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#10b981',
    margin: '1rem 0',
  },

  successText: {
    fontSize: '1.05rem',
    color: '#666',
    lineHeight: '1.6',
  },

  // Footer
  footer: {
    position: 'relative',
    zIndex: 10,
    padding: '3rem 2rem',
    background: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(0,0,0,0.06)',
  },

  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    textAlign: 'center',
  },

  footerBrand: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1rem',
  },

  footerText: {
    color: '#999',
    fontSize: '0.95rem',
  },
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap');

  @keyframes borderGlow {
    0% { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  button:hover {
    transform: translateY(-2px);
  }

  .primaryBtn:hover {
    box-shadow: 0 6px 24px rgba(255,107,53,0.4);
  }

  .secondaryBtn:hover {
    background: #fafafa;
    border-color: #FF6B35;
  }

  .featureCard:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.1);
    border-color: rgba(255,107,53,0.3);
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: #FF6B35;
    background: #fff;
  }

  .closeBtn:hover {
    background: #e5e5e5;
  }

  @media (max-width: 768px) {
    .statsGrid, .featuresGrid {
      grid-template-columns: 1fr !important;
    }
  }
`;
document.head.appendChild(styleSheet);

export default LandingPage;