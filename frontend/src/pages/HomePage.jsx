import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Target, TrendingUp, Layers, ArrowRight, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div style={styles.page}>
      <Navbar />

      {/* HERO SECTION */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Find Top Developers<br />
            <span style={styles.highlight}>Before Your Competitors Do</span>
          </h1>
          <p style={styles.heroSubtitle}>
            AI-powered developer sourcing with intelligent scoring, specialization insights, 
            and personalized outreach that gets 60%+ reply rates.
          </p>
          <div style={styles.ctaButtons}>
            <Link to="/signup" style={styles.primaryCta}>
              Get Started Free
              <ArrowRight size={20} />
            </Link>
            <Link to="/contact" style={styles.secondaryCta}>
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      {/* DEMO VIDEO SECTION */}
      <section style={styles.demoSection}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>See TalentBox in Action</h2>
          <p style={styles.sectionSubtitle}>
            Watch how companies find and hire developers 10x faster
          </p>
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
        <div style={styles.container}>
          <div style={styles.featuresGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <Target size={32} color="#FF6B35" />
              </div>
              <h3 style={styles.featureTitle}>AI-Powered Scoring</h3>
              <p style={styles.featureText}>
                Instantly evaluate developers with 0-100 scores based on contributions, 
                repos, stars, and tech stack depth.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <TrendingUp size={32} color="#FF6B35" />
              </div>
              <h3 style={styles.featureTitle}>60%+ Reply Rates</h3>
              <p style={styles.featureText}>
                Personalized outreach that actually gets responses, not generic spam 
                that gets ignored.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <Layers size={32} color="#FF6B35" />
              </div>
              <h3 style={styles.featureTitle}>Specialization Search</h3>
              <p style={styles.featureText}>
                Find developers by niche skills, tech stacks, and specific expertise 
                in seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section style={styles.ctaSection}>
        <div style={styles.container}>
          <div style={styles.ctaBox}>
            <h2 style={styles.ctaTitle}>Ready to Hire Faster?</h2>
            <p style={styles.ctaSubtitle}>
              Join companies already using TalentBox to find top developers
            </p>
            <Link to="/signup" style={styles.ctaButton}>
              Start Free Trial
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#ffffff',
    fontFamily: "'Outfit', sans-serif",
  },

  hero: {
    padding: '6rem 2rem',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
    borderBottom: '1px solid #f3f4f6',
  },

  heroContent: {
    maxWidth: '900px',
    margin: '0 auto',
    textAlign: 'center',
  },

  heroTitle: {
    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: '1.2',
    marginBottom: '1.5rem',
  },

  highlight: {
    color: '#FF6B35',
  },

  heroSubtitle: {
    fontSize: 'clamp(1.125rem, 2vw, 1.375rem)',
    color: '#6b7280',
    lineHeight: '1.7',
    marginBottom: '2.5rem',
    maxWidth: '700px',
    margin: '0 auto 2.5rem',
  },

  ctaButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  primaryCta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 2rem',
    fontSize: '1.0625rem',
    fontWeight: '600',
    background: '#FF6B35',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '10px',
    transition: 'all 0.2s',
  },

  secondaryCta: {
    padding: '1rem 2rem',
    fontSize: '1.0625rem',
    fontWeight: '600',
    background: '#fff',
    color: '#1a1a1a',
    textDecoration: 'none',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    transition: 'all 0.2s',
  },

  demoSection: {
    padding: '6rem 2rem',
    background: '#f9fafb',
  },

  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },

  sectionTitle: {
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: '1rem',
  },

  sectionSubtitle: {
    fontSize: '1.125rem',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '3rem',
  },

  videoWrapper: {
    position: 'relative',
    paddingBottom: '56.25%',
    height: 0,
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
  },

  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },

  featuresSection: {
    padding: '6rem 2rem',
    background: '#ffffff',
  },

  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '2rem',
  },

  featureCard: {
    padding: '2rem',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    transition: 'all 0.3s',
  },

  featureIcon: {
    width: '64px',
    height: '64px',
    background: '#fff5f2',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },

  featureTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1rem',
  },

  featureText: {
    fontSize: '1rem',
    color: '#6b7280',
    lineHeight: '1.7',
  },

  ctaSection: {
    padding: '6rem 2rem',
    background: 'linear-gradient(135deg, #FF6B35 0%, #ff8a65 100%)',
  },

  ctaBox: {
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'center',
  },

  ctaTitle: {
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '1rem',
  },

  ctaSubtitle: {
    fontSize: '1.25rem',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: '2rem',
  },

  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 2.5rem',
    fontSize: '1.0625rem',
    fontWeight: '600',
    background: '#ffffff',
    color: '#FF6B35',
    textDecoration: 'none',
    borderRadius: '10px',
    transition: 'all 0.2s',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
};

// Hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  a[style*="primaryCta"]:hover {
    background: #ff5722 !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(255,107,53,0.4);
  }
  
  a[style*="secondaryCta"]:hover {
    border-color: #FF6B35 !important;
    color: #FF6B35 !important;
  }
  
  div[style*="featureCard"]:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.1) !important;
  }
  
  a[style*="ctaButton"]:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
  }
`;
document.head.appendChild(styleSheet);

export default HomePage;