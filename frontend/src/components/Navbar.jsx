import React from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

const Navbar = () => {
  return (
    <header style={styles.header}>
      <div style={styles.container}>
        {/* Logo */}
        <Link to="/" style={styles.logo}>
          <Package size={28} color="#FF6B35" />
          <span style={styles.logoText}>TalentBox</span>
        </Link>

        {/* Navigation */}
        <nav style={styles.nav}>
          <Link to="/" style={styles.navLink}>Home</Link>
          <Link to="/pricing" style={styles.navLink}>Pricing</Link>
          <Link to="/contact" style={styles.navLink}>Contact</Link>
        </nav>

        {/* Auth Buttons */}
        <div style={styles.authButtons}>
          <Link to="/login" style={styles.loginBtn}>Log In</Link>
          <Link to="/signup" style={styles.signupBtn}>
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
};

const styles = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid #e5e7eb',
    padding: '1rem 0',
    fontFamily: "'Outfit', sans-serif",
  },

  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  },

  logoText: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1a1a1a',
  },

  nav: {
    display: 'flex',
    gap: '2rem',
    flex: 1,
    justifyContent: 'center',
  },

  navLink: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#6b7280',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },

  authButtons: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },

  loginBtn: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
    textDecoration: 'none',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },

  signupBtn: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#fff',
    background: '#FF6B35',
    textDecoration: 'none',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
};

// Hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  a[style*="navLink"]:hover {
    color: #FF6B35 !important;
  }
  
  a[style*="loginBtn"]:hover {
    border-color: #FF6B35 !important;
    color: #FF6B35 !important;
  }
  
  a[style*="signupBtn"]:hover {
    background: #ff5722 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255,107,53,0.3);
  }
`;
document.head.appendChild(styleSheet);

export default Navbar;