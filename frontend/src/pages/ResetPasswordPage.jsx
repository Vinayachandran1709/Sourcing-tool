import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Lock, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { resetPassword } from '../services/api';

// Animations (guarded to prevent duplicate injection)
if (!document.getElementById('reset-password-styles')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = 'reset-password-styles';
  styleSheet.textContent = `
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(styleSheet);
}

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '' });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Redirect to login if no token
  if (!token) {
    return (
      <div style={styles.page}>
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
          </div>
        </div>
        <div style={styles.rightSide}>
          <div style={styles.formContainer}>
            <div style={styles.errorBox}>
              <AlertCircle size={20} color="#dc2626" />
              <span>Invalid reset link. Please request a new password reset.</span>
            </div>
            <Link to="/forgot-password" style={styles.submitButton}>
              Request new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const checkPasswordStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.match(/[a-z]/)) score++;
    if (pw.match(/[A-Z]/)) score++;
    if (pw.match(/[0-9]/)) score++;
    if (pw.match(/[^a-zA-Z0-9]/)) score++;
    let text = score <= 2 ? 'Weak' : score <= 3 ? 'Medium' : score <= 4 ? 'Strong' : 'Very Strong';
    if (score === 0) text = '';
    return { score, text };
  };

  const getStrengthColor = () => {
    const s = passwordStrength.score;
    if (s <= 2) return '#ef4444';
    if (s === 3) return '#f59e0b';
    return '#10b981';
  };

  const getPasswordErrors = (pw) => {
    const errors = [];
    if (pw.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(pw)) errors.push('An uppercase letter');
    if (!/[a-z]/.test(pw)) errors.push('A lowercase letter');
    if (!/\d/.test(pw)) errors.push('A number');
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const pwErrors = getPasswordErrors(password);
    if (pwErrors.length > 0) {
      setError('Password must include: ' + pwErrors.join(', '));
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. The link may have expired.');
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
            Set a New<br />
            <span style={styles.highlight}>Password</span>
          </h1>
          <p style={styles.brandSubtitle}>
            Choose a strong password to keep your account secure.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div style={styles.rightSide}>
        <div style={styles.formContainer}>
          {success ? (
            /* Success State */
            <div>
              <div style={{ ...styles.successBox, animation: 'slideIn 0.3s ease-out' }}>
                <CheckCircle size={20} color="#10b981" />
                <span>Password reset successfully! Redirecting to login...</span>
              </div>
              <Link to="/login" style={styles.loginLink}>Go to login now</Link>
            </div>
          ) : (
            /* Form */
            <div>
              <div style={styles.formHeader}>
                <h2 style={styles.formTitle}>Create new password</h2>
                <p style={styles.formSubtitle}>Your new password must be different from your previous password.</p>
              </div>

              {error && (
                <div style={styles.errorBox}>
                  <AlertCircle size={20} color="#dc2626" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>New Password</label>
                  <div style={styles.inputWrapper}>
                    <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordStrength(checkPasswordStrength(e.target.value));
                        if (error) setError('');
                      }}
                      placeholder="Min 8 characters"
                      style={styles.inputWithToggle}
                      required
                      disabled={loading}
                      minLength={8}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.passwordToggle}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={20} color="#9ca3af" /> : <Eye size={20} color="#9ca3af" />}
                    </button>
                  </div>
                  {password && (
                    <>
                      <div style={styles.strengthWrapper}>
                        <div style={styles.strengthBar}>
                          <div style={{ height: '100%', width: `${(passwordStrength.score / 5) * 100}%`, background: getStrengthColor(), borderRadius: '2px', transition: 'all 0.3s' }} />
                        </div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: getStrengthColor(), minWidth: '80px' }}>{passwordStrength.text}</span>
                      </div>
                      <div style={styles.requirementsList}>
                        {[
                          { met: password.length >= 8, label: 'At least 8 characters' },
                          { met: /[A-Z]/.test(password), label: 'An uppercase letter' },
                          { met: /[a-z]/.test(password), label: 'A lowercase letter' },
                          { met: /\d/.test(password), label: 'A number' },
                        ].map((req) => (
                          <div key={req.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {req.met
                              ? <CheckCircle size={14} color="#10b981" />
                              : <AlertCircle size={14} color="#9ca3af" />}
                            <span style={{ color: req.met ? '#10b981' : '#9ca3af', fontSize: '0.8125rem' }}>{req.label}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Confirm Password</label>
                  <div style={styles.inputWrapper}>
                    <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Confirm your password"
                      style={styles.inputWithToggle}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.passwordToggle}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={20} color="#9ca3af" /> : <Eye size={20} color="#9ca3af" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <div style={styles.matchIndicator}>
                      {password === confirmPassword
                        ? (<><CheckCircle size={16} color="#10b981" /><span style={{ color: '#10b981' }}>Passwords match</span></>)
                        : (<><AlertCircle size={16} color="#ef4444" /><span style={{ color: '#ef4444' }}>Passwords don't match</span></>)}
                    </div>
                  )}
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
                  {loading ? 'Resetting...' : (<><span>Reset Password</span><ArrowRight size={20} /></>)}
                </button>
              </form>
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
  successBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', marginBottom: '1.5rem', color: '#16a34a', fontSize: '0.9375rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.9375rem', fontWeight: '600', color: '#1a1a1a' },
  inputWrapper: { position: 'relative' },
  inputIcon: { position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
  inputWithToggle: { width: '100%', padding: '0.875rem 3rem 0.875rem 3rem', fontSize: '1rem', color: '#1a1a1a', background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: '10px', transition: 'all 0.2s', fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box' },
  passwordToggle: { position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  strengthWrapper: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' },
  strengthBar: { flex: 1, height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' },
  requirementsList: { display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' },
  matchIndicator: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.8125rem', fontWeight: '500' },
  submitButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontSize: '1.0625rem', fontWeight: '600', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Outfit', sans-serif", textDecoration: 'none', marginTop: '0.5rem' },
  loginLink: { display: 'block', textAlign: 'center', color: '#FF6B35', fontWeight: '600', textDecoration: 'none', fontSize: '0.9375rem' },
};

export default ResetPasswordPage;
