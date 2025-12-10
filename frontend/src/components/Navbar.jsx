import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Package, Menu, X } from 'lucide-react';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    <nav style={styles.navbar}>
      <div style={styles.navContainer}>
        <a href="/" onClick={handleLogoClick} style={styles.logo}>
          <Package size={28} color="#FF6B35" />
          <span style={styles.logoText}>TalentBox</span>
        </a>

        <div style={styles.navLinks}>
          <Link to="/pricing" style={styles.navLink}>Pricing</Link>
          <Link to="/contact" style={styles.navLink}>Contact</Link>
          <Link to="/login" style={styles.navLink}>Log in</Link>
          <Link to="/signup" style={styles.signupBtn}>Start Free Trial</Link>
        </div>

        <button style={styles.mobileMenuBtn} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div style={styles.mobileMenu}>
          <Link to="/pricing" style={styles.mobileLink} onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
          <Link to="/contact" style={styles.mobileLink} onClick={() => setMobileMenuOpen(false)}>Contact</Link>
          <Link to="/login" style={styles.mobileLink} onClick={() => setMobileMenuOpen(false)}>Log in</Link>
          <Link to="/signup" style={styles.mobileSignupBtn} onClick={() => setMobileMenuOpen(false)}>Start Free Trial</Link>
        </div>
      )}
    </nav>
  );
};

const styles = {
  navbar: { position: 'sticky', top: 0, background: '#ffffff', borderBottom: '1px solid #f3f4f6', zIndex: 1000, fontFamily: "'Outfit', sans-serif" },
  navContainer: { maxWidth: '1200px', margin: '0 auto', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', cursor: 'pointer' },
  logoText: { fontSize: '1.5rem', fontWeight: '700', color: '#1a1a1a' },
  navLinks: { display: 'flex', alignItems: 'center', gap: '2rem' },
  navLink: { color: '#4b5563', textDecoration: 'none', fontWeight: '500', fontSize: '0.9375rem', transition: 'color 0.2s' },
  signupBtn: { padding: '0.625rem 1.25rem', background: '#FF6B35', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9375rem' },
  mobileMenuBtn: { display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: '#1a1a1a' },
  mobileMenu: { display: 'none', flexDirection: 'column', padding: '1rem 2rem 2rem', background: '#ffffff', borderTop: '1px solid #f3f4f6' },
  mobileLink: { padding: '0.75rem 0', color: '#4b5563', textDecoration: 'none', fontWeight: '500', borderBottom: '1px solid #f3f4f6' },
  mobileSignupBtn: { marginTop: '1rem', padding: '0.75rem', background: '#FF6B35', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', textAlign: 'center' },
};

export default Navbar;