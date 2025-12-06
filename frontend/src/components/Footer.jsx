import React from 'react';
import { Package, Twitter, Linkedin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        {/* Top Section */}
        <div style={styles.topSection}>
          {/* Brand */}
          <div style={styles.brandSection}>
            <div style={styles.brand}>
              <Package size={32} color="#FF6B35" />
              <span style={styles.brandText}>TalentBox</span>
            </div>
            <p style={styles.tagline}>
              AI-powered developer sourcing that actually works
            </p>
            <div style={styles.socials}>
              <a href="https://twitter.com/talentbox" target="_blank" rel="noopener noreferrer" style={styles.socialLink}>
                <Twitter size={20} />
              </a>
              <a href="https://linkedin.com/company/talentbox" target="_blank" rel="noopener noreferrer" style={styles.socialLink}>
                <Linkedin size={20} />
              </a>
              <a href="mailto:hello@talentbox.com" style={styles.socialLink}>
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div style={styles.linksSection}>
            <div style={styles.linkColumn}>
              <h4 style={styles.linkTitle}>Product</h4>
              <Link to="/pricing" style={styles.link}>Pricing</Link>
              <Link to="/contact" style={styles.link}>Contact</Link>
            </div>

            <div style={styles.linkColumn}>
              <h4 style={styles.linkTitle}>Company</h4>
              <Link to="/about" style={styles.link}>About</Link>
              <Link to="/blog" style={styles.link}>Blog</Link>
            </div>

            <div style={styles.linkColumn}>
              <h4 style={styles.linkTitle}>Legal</h4>
              <Link to="/privacy" style={styles.link}>Privacy</Link>
              <Link to="/terms" style={styles.link}>Terms</Link>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div style={styles.bottomSection}>
          <p style={styles.copyright}>
            © 2025 TalentBox. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    background: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    padding: '4rem 0 2rem',
    fontFamily: "'Outfit', sans-serif",
  },

  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 2rem',
  },

  topSection: {
    display: 'grid',
    gridTemplateColumns: '2fr 3fr',
    gap: '4rem',
    marginBottom: '3rem',
  },

  brandSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },

  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  brandText: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1a1a1a',
  },

  tagline: {
    fontSize: '0.9375rem',
    color: '#6b7280',
    lineHeight: '1.6',
    maxWidth: '300px',
  },

  socials: {
    display: 'flex',
    gap: '1rem',
  },

  socialLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    background: '#f9fafb',
    color: '#6b7280',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },

  linksSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '2rem',
  },

  linkColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },

  linkTitle: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.5rem',
  },

  link: {
    fontSize: '0.9375rem',
    color: '#6b7280',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },

  bottomSection: {
    paddingTop: '2rem',
    borderTop: '1px solid #f3f4f6',
    textAlign: 'center',
  },

  copyright: {
    fontSize: '0.875rem',
    color: '#9ca3af',
  },
};

// Hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  a[style*="socialLink"]:hover {
    background: #FF6B35 !important;
    color: #fff !important;
  }
  
  a[style*="link"]:hover {
    color: #FF6B35 !important;
  }

  @media (max-width: 768px) {
    div[style*="topSection"] {
      grid-template-columns: 1fr !important;
      gap: 2rem !important;
    }
    
    div[style*="linksSection"] {
      grid-template-columns: 1fr !important;
    }
  }
`;
document.head.appendChild(styleSheet);

export default Footer;