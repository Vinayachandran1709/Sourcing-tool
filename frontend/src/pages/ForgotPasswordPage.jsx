import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { forgotPassword } from '../services/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Left Side - Branding */}
      <div style={styles.leftSide}>
        <Link to="/" style={styles.logo}>
          <Package size={32} color="#FF6B35" />
          <span style={styles.logoText}>TalentBox</span>
        </Link>
        <div style={styles.brandingContent}>
          <h1 style={styles.brandTitle}>
            Reset Your<br />
            <span style={styles.highlight}>Password</span>
          </h1>
          <p style={styles.brandSubtitle}>
            No worries, we'll send you a link to reset it.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div style={styles.rightSide}>
        <div style={styles.formContainer}>
          {submitted ? (
            /* Success State */
            <div>
              <div style={styles.successIcon}>
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  <circle cx="28" cy="28" r="28" fill="#f0fdf4" />
                  <circle cx="28" cy="28" r="20" fill="#dcfce7" />
                  <path d="M20 28l5 5L36 22" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 style={styles.formTitle}>Check your email</h2>
              <p style={styles.successText}>
                If an account exists for <strong>{email}</strong>, we've sent a password reset link. Please check your inbox and spam folder.
              </p>
              <p style={styles.expiryNote}>The link will expire in 15 minutes.</p>

              <button
                onClick={() => { setSubmitted(false); setEmail(''); }}
                style={styles.resendButton}
              >
                Try a different email
              </button>

              <div style={styles.backRow}>
                <ArrowLeft size={16} color="#FF6B35" />
                <Link to="/login" style={styles.backLink}>Back to login</Link>
              </div>
            </div>
          ) : (
            /* Form State */
            <div>
              <div style={styles.formHeader}>
                <h2 style={styles.formTitle}>Forgot your password?</h2>
                <p style={styles.formSubtitle}>
                  Enter the email you used to create your account and we'll send you a reset link.
                </p>
              </div>

              {error && (
                <div style={styles.errorBox}>
                  <AlertCircle size={20} color="#dc2626" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email address</label>
                  <div style={styles.inputWrapper}>
                    <Mail size={20} color="#9ca3af" style={styles.inputIcon} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                      placeholder="you@company.com"
                      style={styles.input}
                      required
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...styles.submitButton,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              <div style={styles.backRow}>
                <ArrowLeft size={16} color="#FF6B35" />
                <Link to="/login" style={styles.backLink}>Back to login</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', sans-serif" },
  leftSide: { flex: 1, background: 'linear-gradient(135deg, #FF6B35 0%, #ff8a65 100%)', padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#fff' },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' },
  logoText: { fontSize: '1.5rem', fontWeight: '700', color: '#fff' },
  brandingContent: { maxWidth: '500px' },
  brandTitle: { fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', fontWeight: '700', lineHeight: '1.2', marginBottom: '1.5rem' },
  highlight: { opacity: 0.9 },
  brandSubtitle: { fontSize: '1.25rem', lineHeight: '1.7', opacity: 0.9 },
  rightSide: { flex: 1, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' },
  formContainer: { width: '100%', maxWidth: '450px' },
  formHeader: { marginBottom: '2rem' },
  formTitle: { fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.5rem' },
  formSubtitle: { fontSize: '1rem', color: '#6b7280', margin: 0, lineHeight: '1.6' },
  errorBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', marginBottom: '1.5rem', color: '#dc2626', fontSize: '0.9375rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.9375rem', fontWeight: '600', color: '#1a1a1a' },
  inputWrapper: { position: 'relative' },
  inputIcon: { position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
  input: { width: '100%', padding: '0.875rem 1rem 0.875rem 3rem', fontSize: '1rem', color: '#1a1a1a', background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: '10px', transition: 'all 0.2s', fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box' },
  submitButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontSize: '1.0625rem', fontWeight: '600', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Outfit', sans-serif", marginTop: '0.5rem' },
  backRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginTop: '2rem' },
  backLink: { color: '#FF6B35', fontWeight: '600', textDecoration: 'none', fontSize: '0.9375rem' },
  successIcon: { marginBottom: '1.5rem' },
  successText: { fontSize: '1rem', color: '#6b7280', lineHeight: '1.6', marginBottom: '0.5rem' },
  expiryNote: { fontSize: '0.875rem', color: '#9ca3af', marginBottom: '2rem' },
  resendButton: { width: '100%', padding: '0.875rem', fontSize: '1rem', fontWeight: '600', background: '#f9fafb', color: '#1a1a1a', border: '2px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.2s' },
};

export default ForgotPasswordPage;
