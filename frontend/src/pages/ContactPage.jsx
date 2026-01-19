import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Mail, Send, CheckCircle } from 'lucide-react';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
  window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE_URL}/api/public/contact/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setFormData({ name: '', email: '', company: '', message: '' });
        }, 3000);
      }
    } catch (error) {
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <section style={styles.hero}>
        <div style={styles.container}>
          <h1 style={styles.title}>Get in Touch</h1>
          <p style={styles.subtitle}>
            Have questions? We'd love to hear from you. Send us a message and we'll respond within 1 hour.
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
                Reach out to us directly or fill out the form. We're here to help!
              </p>
              </div>

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


            {/* Contact Form */}
            <div style={styles.formSection}>
              {!submitted ? (
                <form onSubmit={handleSubmit} style={styles.form}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      style={styles.input}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Work Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@company.com"
                      style={styles.input}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Company</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Your Company"
                      style={styles.input}
                      disabled={loading}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Message *</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us how we can help..."
                      style={styles.textarea}
                      rows={6}
                      required
                      disabled={loading}
                    />
                  </div>

                  <button type="submit" disabled={loading} style={styles.submitButton}>
                    {loading ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send size={20} />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div style={styles.successMessage}>
                  <CheckCircle size={64} color="#10b981" />
                  <h3 style={styles.successTitle}>Message Sent!</h3>
                  <p style={styles.successText}>
                    Thanks for reaching out. We'll get back to you within 1 hour.
                  </p>
                </div>
              )}
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

  formSection: {
    background: '#ffffff',
    padding: '2.5rem',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },

  label: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  input: {
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    color: '#1a1a1a',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    transition: 'all 0.2s',
    fontFamily: "'Outfit', sans-serif",
  },

  textarea: {
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    color: '#1a1a1a',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    transition: 'all 0.2s',
    fontFamily: "'Outfit', sans-serif",
    resize: 'vertical',
  },

  submitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '1rem',
    fontSize: '1.0625rem',
    fontWeight: '600',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: "'Outfit', sans-serif",
    marginTop: '1rem',
  },

  successMessage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 2rem',
    textAlign: 'center',
  },

  successTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#10b981',
    marginTop: '1.5rem',
    marginBottom: '0.5rem',
  },

  successText: {
    fontSize: '1.0625rem',
    color: '#6b7280',
    lineHeight: '1.7',
  },
};

// Hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  input:focus, textarea:focus {
    outline: none;
    border-color: #FF6B35 !important;
    background: #ffffff !important;
  }
  
  button[style*="submitButton"]:hover:not(:disabled) {
    background: #ff5722 !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(255,107,53,0.3);
  }
  
  button[style*="submitButton"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
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

export default ContactPage;