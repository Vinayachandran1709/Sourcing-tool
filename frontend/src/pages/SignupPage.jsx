import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Mail, Lock, User, Building, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', company: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '' });

  useEffect(() => { 
    window.scrollTo(0, 0);
    // If already authenticated, redirect to dashboard
    if (isAuthenticated) {
      navigate('/dashboard/search');
    }
  }, [isAuthenticated, navigate]);

  const checkPasswordStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.match(/[a-z]/)) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^a-zA-Z0-9]/)) score++;
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

  const getPasswordErrors = (password) => {
    const errors = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('An uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('A lowercase letter');
    if (!/\d/.test(password)) errors.push('A number');
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const pwErrors = getPasswordErrors(formData.password);
    if (pwErrors.length > 0) {
      setError('Password must include: ' + pwErrors.join(', '));
      return;
    }
    setLoading(true);

    const result = await signup(formData.name, formData.email, formData.company, formData.password);

    if (result.success) {
      navigate('/dashboard/search');
    } else {
      setError(result.error || 'Signup failed. Please try again.');
    }

    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (error) setError('');
    if (name === 'password') setPasswordStrength(checkPasswordStrength(value));
  };
  
  return (
    <div style={styles.page}>
      <div style={styles.leftSide}>
        <Link to="/" style={styles.logo}><Package size={32} color="#FF6B35" /><span style={styles.logoText}>TalentBox</span></Link>
        <div style={styles.brandingContent}>
          <h1 style={styles.brandTitle}>Start Hiring Smarter<br />with <span style={styles.highlight}>TalentBox</span></h1>
          <p style={styles.brandSubtitle}>Join companies finding and hiring top developers with AI-powered insights.</p>
        </div>
      </div>

      <div style={styles.rightSide}>
        <div style={styles.formContainer}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Create your account</h2>
            <p style={styles.formSubtitle}>Already have an account? <Link to="/login" style={styles.loginLink}>Log in</Link></p>
          </div>

          {error && <div style={styles.errorBox}><AlertCircle size={20} color="#dc2626" /><span>{error}</span></div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name</label>
              <div style={styles.inputWrapper}>
                <User size={20} color="#9ca3af" style={styles.inputIcon} />
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" style={styles.input} required disabled={loading} />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Work Email</label>
              <div style={styles.inputWrapper}>
                <Mail size={20} color="#9ca3af" style={styles.inputIcon} />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@company.com" style={styles.input} required disabled={loading} />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Company</label>
              <div style={styles.inputWrapper}>
                <Building size={20} color="#9ca3af" style={styles.inputIcon} />
                <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="Your Company" style={styles.input} required disabled={loading} />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="Min 8 characters" style={styles.inputWithToggle} required disabled={loading} minLength={8} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.passwordToggle} tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={20} color="#9ca3af" /> : <Eye size={20} color="#9ca3af" />}
                </button>
              </div>
              {formData.password && (
                <>
                  <div style={styles.strengthWrapper}>
                    <div style={styles.strengthBar}><div style={{ height: '100%', width: `${(passwordStrength.score / 5) * 100}%`, background: getStrengthColor(), borderRadius: '2px', transition: 'all 0.3s' }} /></div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: getStrengthColor(), minWidth: '80px' }}>{passwordStrength.text}</span>
                  </div>
                  <div style={styles.requirementsList}>
                    {[
                      { met: formData.password.length >= 8, label: 'At least 8 characters' },
                      { met: /[A-Z]/.test(formData.password), label: 'An uppercase letter' },
                      { met: /[a-z]/.test(formData.password), label: 'A lowercase letter' },
                      { met: /\d/.test(formData.password), label: 'A number' },
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
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" style={styles.inputWithToggle} required disabled={loading} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.passwordToggle} tabIndex={-1} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                  {showConfirmPassword ? <EyeOff size={20} color="#9ca3af" /> : <Eye size={20} color="#9ca3af" />}
                </button>
              </div>
              {formData.confirmPassword && (
                <div style={styles.matchIndicator}>
                  {formData.password === formData.confirmPassword ? (<><CheckCircle size={16} color="#10b981" /><span style={{ color: '#10b981' }}>Passwords match</span></>) : (<><AlertCircle size={16} color="#ef4444" /><span style={{ color: '#ef4444' }}>Passwords don't match</span></>)}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} style={styles.submitButton}>
              {loading ? 'Creating account...' : (<><span>Create Account</span><ArrowRight size={20} /></>)}
            </button>

            <p style={styles.terms}>By signing up, you agree to our <Link to="/terms" style={styles.termsLink}>Terms</Link> and <Link to="/privacy" style={styles.termsLink}>Privacy Policy</Link></p>
          </form>
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
  rightSide: { flex: 1, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 3rem', overflowY: 'auto' },
  formContainer: { width: '100%', maxWidth: '450px' },
  formHeader: { marginBottom: '1.5rem' },
  formTitle: { fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.5rem' },
  formSubtitle: { fontSize: '1rem', color: '#6b7280', margin: 0 },
  loginLink: { color: '#FF6B35', fontWeight: '600', textDecoration: 'none' },
  errorBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', marginBottom: '1.5rem', color: '#dc2626', fontSize: '0.9375rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.9375rem', fontWeight: '600', color: '#1a1a1a' },
  inputWrapper: { position: 'relative' },
  inputIcon: { position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
  input: { width: '100%', padding: '0.875rem 1rem 0.875rem 3rem', fontSize: '1rem', color: '#1a1a1a', background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: '10px', fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box' },
  inputWithToggle: { width: '100%', padding: '0.875rem 3rem 0.875rem 3rem', fontSize: '1rem', color: '#1a1a1a', background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: '10px', fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box' },
  passwordToggle: { position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex' },
  requirementsList: { display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' },
  strengthWrapper: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' },
  strengthBar: { flex: 1, height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' },
  matchIndicator: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.8125rem', fontWeight: '500' },
  submitButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontSize: '1.0625rem', fontWeight: '600', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", marginTop: '0.5rem' },
  terms: { fontSize: '0.875rem', color: '#9ca3af', textAlign: 'center', marginTop: '0.5rem' },
  termsLink: { color: '#FF6B35', textDecoration: 'none', fontWeight: '600' },
};

export default SignupPage;