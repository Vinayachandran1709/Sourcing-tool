import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';

const Footer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogoClick = (e) => {
    e.preventDefault();
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.grid}>
          <div style={styles.brandSection}>
            <a href="/" onClick={handleLogoClick} style={styles.logo}>
              <Package size={28} color="#FF6B35" />
              <span style={styles.logoText}>TalentBox</span>
            </a>
            <p style={styles.tagline}>AI-powered developer sourcing that actually works.</p>
          </div>

          <div style={styles.linksSection}>
            <h4 style={styles.linksTitle}>Product</h4>
            <Link to="/pricing" style={styles.link}>Pricing</Link>
            <Link to="/contact" style={styles.link}>Contact</Link>
          </div>

          <div style={styles.linksSection}>
            <h4 style={styles.linksTitle}>Company</h4>
            <Link to="/about" style={styles.link}>About</Link>
            <Link to="/privacy" style={styles.link}>Privacy</Link>
            <Link to="/terms" style={styles.link}>Terms</Link>
          </div>
        </div>

        <div style={styles.bottom}>
          <p style={styles.copyright}>© 2025 TalentBox. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

const styles = {
  footer: { background: '#1a1a1a', color: '#ffffff', padding: '4rem 2rem 2rem', fontFamily: "'Outfit', sans-serif" },
  container: { maxWidth: '1100px', margin: '0 auto' },
  grid: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '4rem', marginBottom: '3rem' },
  brandSection: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '1rem', cursor: 'pointer' },
  logoText: { fontSize: '1.5rem', fontWeight: '700', color: '#ffffff' },
  tagline: { fontSize: '1rem', color: '#9ca3af', lineHeight: '1.6', margin: 0, textAlign: 'left', maxWidth: '280px' },
  linksSection: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  linksTitle: { fontSize: '0.875rem', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' },
  link: { color: '#9ca3af', textDecoration: 'none', fontSize: '0.9375rem', transition: 'color 0.2s' },
  bottom: { paddingTop: '2rem', borderTop: '1px solid #374151', textAlign: 'center' },
  copyright: { fontSize: '0.875rem', color: '#6b7280', margin: 0 },
};

export default Footer;