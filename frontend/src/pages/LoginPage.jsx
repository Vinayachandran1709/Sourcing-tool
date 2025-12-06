import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Mail, Lock, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Replace with actual API call
    try {
      // Simulated login - replace with real auth
      setTimeout(() => {
        // On success, redirect to dashboard
        navigate('/dashboard/search');
      }, 1000);
    } catch (error) {
      alert('Login failed. Please try again.');
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
      {/* Left Side - Branding */}
      <div style={styles.leftSide}>
        <Link to="/" style={styles.logo}>
          <Package size={32} color="#FF6B35" />
          <span style={styles.logoText}>TalentBox</span>
        </Link>

        <div style={styles.brandingContent}>
          <h1 style={styles.brandTitle}>
            Welcome Back to<br />
            <span style={styles.highlight}>TalentBox</span>
          </h1>
          <p style={styles.brandSubtitle}>
            Continue finding and hiring top developers with AI-powered insights.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div style={styles.rightSide}>
        <div style={styles.formContainer}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Log in to your account</h2>
            <p style={styles.formSubtitle}>
              Don't have an account?{' '}
              <Link to="/signup" style={styles.signupLink}>
                Sign up
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email address</label>
              <div style={styles.inputWrapper}>
                <Mail size={20} color="#9ca3af" style={styles.inputIcon} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  style={styles.input}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  style={styles.input}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div style={styles.forgotPassword}>
              <Link to="/forgot-password" style={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} style={styles.submitButton}>
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Outfit', sans-serif",
  },

  leftSide: {
    flex: 1,
    background: 'linear-gradient(135deg, #FF6B35 0%, #ff8a65 100%)',
    padding: '3rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    color: '#fff',
  },

  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  },

  logoText: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#fff',
  },

  brandingContent: {
    maxWidth: '500px',
  },

  brandTitle: {
    fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
    fontWeight: '700',
    lineHeight: '1.2',
    marginBottom: '1.5rem',
  },

  highlight: {
    opacity: 0.9,
  },

  brandSubtitle: {
    fontSize: '1.25rem',
    lineHeight: '1.7',
    opacity: 0.9,
  },

  rightSide: {
    flex: 1,
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
  },

  formContainer: {
    width: '100%',
    maxWidth: '450px',
  },

  formHeader: {
    marginBottom: '3rem',
  },

  formTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '0.5rem',
  },

  formSubtitle: {
    fontSize: '1rem',
    color: '#6b7280',
  },

  signupLink: {
    color: '#FF6B35',
    fontWeight: '600',
    textDecoration: 'none',
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

  inputWrapper: {
    position: 'relative',
  },

  inputIcon: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },

  input: {
    width: '100%',
    padding: '0.875rem 1rem 0.875rem 3rem',
    fontSize: '1rem',
    color: '#1a1a1a',
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    transition: 'all 0.2s',
    fontFamily: "'Outfit', sans-serif",
  },

  forgotPassword: {
    textAlign: 'right',
  },

  forgotLink: {
    fontSize: '0.9375rem',
    color: '#FF6B35',
    fontWeight: '600',
    textDecoration: 'none',
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
};

// Hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  input:focus {
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
  
  a[style*="signupLink"]:hover,
  a[style*="forgotLink"]:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    div[style*="page"] {
      flex-direction: column !important;
    }
    
    div[style*="leftSide"] {
      padding: 2rem !important;
    }
    
    div[style*="brandingContent"] {
      display: none;
    }
  }
`;
document.head.appendChild(styleSheet);

export default LoginPage;