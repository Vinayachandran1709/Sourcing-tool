import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useCandidateAuth } from '../contexts/CandidateAuthContext';
import { uploadCandidateResume } from '../services/candidateApi';

const CandidateSignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    github_username: '',
    linkedin_url: '',
    portfolio_url: '',
    location: ''
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { candidateSignup } = useCandidateAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await candidateSignup(formData);
      
      if (result.success) {
        if (resumeFile) {
          try {
            await uploadCandidateResume(resumeFile);
          } catch (uploadError) {
            console.error("Resume upload failed during signup", uploadError);
            // We still proceed even if resume fails
          }
        }
        
        if (formData.github_username || resumeFile || formData.portfolio_url) {
          navigate('/candidate/import');
        } else {
          navigate('/candidate/dashboard');
        }
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
            <h1 style={styles.title}>Join TalentBox as a Developer</h1>
            <p style={styles.subtitle}>Create your profile to get discovered by top startups.</p>
          </div>

          {error && <div style={styles.errorAlert}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={styles.input}
                  required
                  placeholder="Jane Doe"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={styles.input}
                  required
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  style={styles.input}
                  required
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>GitHub Username</label>
              <input
                type="text"
                name="github_username"
                value={formData.github_username}
                onChange={handleChange}
                style={styles.input}
                placeholder="janedoe"
              />
              <span style={styles.helperText}>
                Highly encouraged! We'll analyze your GitHub profile to instantly build your developer identity.
              </span>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>LinkedIn URL</label>
                <input
                  type="url"
                  name="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="https://linkedin.com/in/janedoe"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Portfolio URL</label>
                <input
                  type="url"
                  name="portfolio_url"
                  value={formData.portfolio_url}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="https://janedoe.dev"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                style={styles.input}
                placeholder="San Francisco, CA (or Remote)"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Resume Upload (.pdf, .docx, .txt)</label>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                style={styles.fileInput}
              />
            </div>

            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Developer Account'}
            </button>

            <div style={styles.footer}>
              Already have an account? <Link to="/candidate/login" style={styles.link}>Log in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: '#fafafa', fontFamily: "'Outfit', sans-serif" },
  container: { maxWidth: '800px', margin: '40px auto', padding: '0 20px' },
  formCard: { background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' },
  header: { textAlign: 'center', marginBottom: '32px' },
  title: { fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' },
  subtitle: { color: '#6b7280', fontSize: '1.05rem' },
  errorAlert: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  formRow: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '250px' },
  label: { fontSize: '0.9rem', fontWeight: '600', color: '#374151' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' },
  fileInput: { padding: '8px 0', fontSize: '0.9rem', color: '#4b5563' },
  helperText: { fontSize: '0.8rem', color: '#FF6B35', marginTop: '4px', fontWeight: '500' },
  submitBtn: { marginTop: '10px', padding: '12px', background: '#FF6B35', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '1.05rem', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.2s' },
  footer: { textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#4b5563' },
  link: { color: '#FF6B35', fontWeight: '600', textDecoration: 'none' }
};

export default CandidateSignupPage;
