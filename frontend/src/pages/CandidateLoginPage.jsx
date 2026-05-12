import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useCandidateAuth } from '../contexts/CandidateAuthContext';

const CandidateLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { candidateLogin } = useCandidateAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await candidateLogin(email, password);
      if (result.success) {
        navigate('/candidate/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.formCard}>
          <div style={styles.header}>
            <h1 style={styles.title}>Developer Login</h1>
            <p style={styles.subtitle}>Welcome back to TalentBox</p>
          </div>

          {error && <div style={styles.errorAlert}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
                placeholder="jane@example.com"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
                placeholder="••••••••"
              />
            </div>

            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>

            <div style={styles.footer}>
              Don't have an account? <Link to="/candidate/signup" style={styles.link}>Sign up</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: '#fafafa', fontFamily: "'Outfit', sans-serif" },
  container: { maxWidth: '450px', margin: '60px auto', padding: '0 20px' },
  formCard: { background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' },
  header: { textAlign: 'center', marginBottom: '32px' },
  title: { fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' },
  subtitle: { color: '#6b7280', fontSize: '1.05rem' },
  errorAlert: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '0.9rem', fontWeight: '600', color: '#374151' },
  input: { padding: '12px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' },
  submitBtn: { marginTop: '10px', padding: '12px', background: '#FF6B35', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '1.05rem', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.2s' },
  footer: { textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#4b5563' },
  link: { color: '#FF6B35', fontWeight: '600', textDecoration: 'none' }
};

export default CandidateLoginPage;
