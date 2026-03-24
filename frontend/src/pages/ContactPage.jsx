import React, { useEffect } from 'react';
import Cal, { getCalApi } from '@calcom/embed-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Mail } from 'lucide-react';
import { trackPageEntry, trackPageExit } from '../services/analytics';

const ContactPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageEntry('contact_page');
    return () => trackPageExit('contact_page');
  }, []);

  useEffect(() => {
    (async function () {
      const cal = await getCalApi({ namespace: 'demo-meeting' });
      cal('ui', {
        styles: { branding: { brandColor: '#FF6B35' } },
        hideEventTypeDetails: false,
        layout: 'month_view',
      });
    })();
  }, []);

  return (
    <div style={styles.page}>
      <Navbar />

      <section style={styles.hero}>
        <div style={styles.container}>
          <h1 style={styles.title}>Get in Touch</h1>
          <p style={styles.subtitle}>
            Have questions? We'd love to hear from you. Book a time that works best for you.
          </p>
        </div>
      </section>

      <section style={styles.contentSection}>
        <div style={styles.container}>
          <div style={styles.grid}>
            {/* Contact Info */}
            <div style={styles.infoSection}>
              <h2 style={styles.infoTitle}>Contact Information</h2>
              <p style={styles.infoText}>
                Reach out to us directly or book a meeting. We're here to help!
              </p>

              <div style={styles.contactDetails}>
                <div style={styles.contactItem}>
                  <div style={styles.iconBox}>
                    <Mail size={24} color="#FF6B35" />
                  </div>
                  <div>
                    <h4 style={styles.contactLabel}>Email</h4>
                    <a href="mailto:contact@talentbox.co" style={styles.contactValue}>
                      contact@talentbox.co
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Cal.com Embed */}
            <div style={styles.calSection}>
              <Cal
                namespace="demo-meeting"
                calLink="vinayachandran/demo-meeting"
                style={{ width: '100%', height: '100%', minHeight: '600px', overflow: 'scroll' }}
                config={{ layout: 'month_view' }}
              />
            </div>
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
    padding: '4rem 2rem 3rem',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
    textAlign: 'center',
    borderBottom: '1px solid #f3f4f6',
  },

  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },

  title: {
    fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1rem',
  },

  subtitle: {
    fontSize: '1.25rem',
    color: '#6b7280',
    maxWidth: '700px',
    margin: '0 auto',
  },

  contentSection: {
    padding: '4rem 2rem',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '4rem',
  },

  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },

  infoTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1a1a1a',
  },

  infoText: {
    fontSize: '1.0625rem',
    color: '#6b7280',
    lineHeight: '1.7',
  },

  contactDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    marginTop: '1rem',
  },

  contactItem: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
  },

  iconBox: {
    width: '56px',
    height: '56px',
    background: '#fff5f2',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  contactLabel: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.5rem',
  },

  contactValue: {
    fontSize: '1.0625rem',
    color: '#6b7280',
    textDecoration: 'none',
  },

  calSection: {
    background: '#ffffff',
    borderRadius: '16px',
    overflow: 'hidden',
    minHeight: '600px',
  },
};

if (!document.getElementById('contact-page-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'contact-page-styles';
  styleSheet.textContent = `
    a[style*="contactValue"]:hover {
      color: #FF6B35 !important;
    }

    @media (max-width: 768px) {
      div[style*="grid"] {
        grid-template-columns: 1fr !important;
        gap: 2rem !important;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default ContactPage;
