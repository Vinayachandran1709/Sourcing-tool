import React, { useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../services/api';

const remotePolicies = ['Remote', 'Hybrid', 'On-site'];
const seniorityLevels = ['Junior', 'Mid-Level', 'Senior', 'Lead', 'Staff'];

const PostJobPage = () => {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [jobId, setJobId] = useState(null);
  const [form, setForm] = useState({
    company_name: '',
    company_website: '',
    poster_name: '',
    poster_email: '',
    phone: '',
    job_title: '',
    description: '',
    location: '',
    remote_policy: 'Remote',
    seniority_level: 'Mid-Level',
    must_have_skills: '',
    team_info: '',
    compensation_range: '',
    jd_filename: '',
  });

  const stepTitle = useMemo(() => {
    if (step === 1) return 'Step 1: Company information';
    if (step === 2) return 'Step 2: Job details';
    if (step === 3) return 'Step 3: AI follow-up questions';
    return 'Step 4: Confirmation';
  }, [step]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateStepOne = () => {
    if (!form.company_name.trim() || !form.company_website.trim() || !form.poster_name.trim() || !form.poster_email.trim()) {
      setError('Please complete all required company details.');
      return false;
    }
    return true;
  };

  const validateStepTwo = () => {
    if (!form.job_title.trim() || !form.description.trim()) {
      setError('Please add a job title and job description before continuing.');
      return false;
    }
    return true;
  };

  const handleNextFromCompany = (e) => {
    e.preventDefault();
    setError('');
    if (!validateStepOne()) return;
    setStep(2);
  };

  const handleNextFromJob = (e) => {
    e.preventDefault();
    setError('');
    if (!validateStepTwo()) return;
    setStep(3);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/api/extract-jd-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.data?.success) {
        setForm((prev) => ({
          ...prev,
          description: response.data.text,
          jd_filename: response.data.filename,
        }));
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not extract text from the uploaded file.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateStepOne() || !validateStepTwo()) return;

    setLoading(true);
    try {
      const response = await api.post('/api/company/post-job', form);
      if (response.data?.success) {
        setJobId(response.data.job_id);
        setSuccessMessage(response.data.message);
        setStep(4);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to post the job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <section style={styles.heroSection}>
        <div style={styles.heroInner}>
          <span style={styles.eyebrow}>Startup hiring, without the busywork</span>
          <h1 style={styles.heroTitle}>Post a startup engineering role for free</h1>
          <p style={styles.heroSubtitle}>
            Share your role, answer a few AI follow-up questions, and we&apos;ll match candidates from our AI-vetted talent pool.
          </p>
        </div>
      </section>

      <section style={styles.formSection}>
        <div style={styles.formShell}>
          <div style={styles.progressRow}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={styles.progressItem}>
                <div style={{ ...styles.progressDot, ...(step >= item ? styles.progressDotActive : {}) }}>{item}</div>
                {item < 4 && <div style={{ ...styles.progressLine, ...(step > item ? styles.progressLineActive : {}) }} />}
              </div>
            ))}
          </div>

          <div style={styles.formCard}>
            <div style={styles.cardHeader}>
              <p style={styles.stepLabel}>{stepTitle}</p>
              <h2 style={styles.cardTitle}>
                {step === 1 && 'Tell us about your company'}
                {step === 2 && 'Describe the role you need to fill'}
                {step === 3 && 'A few quick follow-up questions'}
                {step === 4 && 'Your job is live'}
              </h2>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            {step === 1 && (
              <form onSubmit={handleNextFromCompany}>
                <div style={styles.fieldGrid}>
                  <div>
                    <label style={styles.label}>Company name *</label>
                    <input value={form.company_name} onChange={(e) => updateField('company_name', e.target.value)} style={styles.input} />
                  </div>
                  <div>
                    <label style={styles.label}>Company website *</label>
                    <input value={form.company_website} onChange={(e) => updateField('company_website', e.target.value)} placeholder="https://company.com" style={styles.input} />
                  </div>
                  <div>
                    <label style={styles.label}>Your name *</label>
                    <input value={form.poster_name} onChange={(e) => updateField('poster_name', e.target.value)} style={styles.input} />
                  </div>
                  <div>
                    <label style={styles.label}>Your email *</label>
                    <input type="email" value={form.poster_email} onChange={(e) => updateField('poster_email', e.target.value)} style={styles.input} />
                  </div>
                </div>

                <div style={{ marginTop: '18px' }}>
                  <label style={styles.label}>Phone (optional)</label>
                  <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} style={styles.input} />
                </div>

                <div style={styles.actionsRow}>
                  <button type="submit" style={styles.primaryButton}>Continue →</button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleNextFromJob}>
                <div style={styles.fieldGrid}>
                  <div style={styles.fullWidth}>
                    <label style={styles.label}>Job title *</label>
                    <input value={form.job_title} onChange={(e) => updateField('job_title', e.target.value)} style={styles.input} />
                  </div>

                  <div style={styles.fullWidth}>
                    <label style={styles.label}>Job description *</label>
                    <textarea
                      rows={8}
                      value={form.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      placeholder="Paste the role description here, or upload a PDF / DOCX / TXT file."
                      style={styles.textarea}
                    />
                    <div style={styles.uploadRow}>
                      <button type="button" onClick={() => fileInputRef.current?.click()} style={styles.secondaryButton} disabled={uploadingFile}>
                        {uploadingFile ? 'Reading file...' : 'Upload JD file'}
                      </button>
                      <span style={styles.fileHint}>
                        {form.jd_filename ? `Loaded: ${form.jd_filename}` : 'Supports PDF, DOCX, and TXT'}
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={styles.label}>Location</label>
                    <input value={form.location} onChange={(e) => updateField('location', e.target.value)} placeholder="Bangalore / Remote / San Francisco" style={styles.input} />
                  </div>
                  <div>
                    <label style={styles.label}>Remote policy</label>
                    <select value={form.remote_policy} onChange={(e) => updateField('remote_policy', e.target.value)} style={styles.input}>
                      {remotePolicies.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Seniority level</label>
                    <select value={form.seniority_level} onChange={(e) => updateField('seniority_level', e.target.value)} style={styles.input}>
                      {seniorityLevels.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                </div>

                <div style={styles.actionsRow}>
                  <button type="button" onClick={() => setStep(1)} style={styles.ghostButton}>Back</button>
                  <button type="submit" style={styles.primaryButton}>Continue to AI follow-up →</button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleSubmit}>
                <div style={styles.questionCard}>
                  <label style={styles.label}>What specific technical skills are must-haves for this role?</label>
                  <textarea rows={3} value={form.must_have_skills} onChange={(e) => updateField('must_have_skills', e.target.value)} style={styles.textarea} />
                </div>
                <div style={styles.questionCard}>
                  <label style={styles.label}>What&apos;s the team size and who will this person report to?</label>
                  <textarea rows={3} value={form.team_info} onChange={(e) => updateField('team_info', e.target.value)} style={styles.textarea} />
                </div>
                <div style={styles.questionCard}>
                  <label style={styles.label}>What&apos;s the salary or compensation range for this role?</label>
                  <textarea rows={3} value={form.compensation_range} onChange={(e) => updateField('compensation_range', e.target.value)} style={styles.textarea} />
                </div>

                <div style={styles.actionsRow}>
                  <button type="button" onClick={() => setStep(2)} style={styles.ghostButton}>Back</button>
                  <button type="submit" style={styles.primaryButton} disabled={loading}>
                    {loading ? 'Posting job...' : 'Post job free →'}
                  </button>
                </div>
              </form>
            )}

            {step === 4 && (
              <div style={styles.confirmationBox}>
                <div style={styles.confirmationBadge}>Live</div>
                <h3 style={styles.confirmationTitle}>Your job has been posted!</h3>
                <p style={styles.confirmationText}>
                  {successMessage || `We'll match candidates from our AI-vetted talent pool and send the best profiles to ${form.poster_email} within 24 hours.`}
                </p>
                {jobId && <p style={styles.confirmationMeta}>Job ID: {jobId}</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: '#fff', fontFamily: "'Outfit', sans-serif" },
  heroSection: { padding: '4.5rem 2rem 2.5rem', background: 'linear-gradient(180deg, #fff8f4 0%, #ffffff 100%)' },
  heroInner: { maxWidth: '860px', margin: '0 auto', textAlign: 'center' },
  eyebrow: { display: 'inline-block', padding: '6px 14px', borderRadius: '999px', background: '#fff1eb', color: '#FF6B35', fontWeight: '700', fontSize: '0.85rem', marginBottom: '1rem' },
  heroTitle: { margin: '0 0 12px 0', fontSize: 'clamp(2.3rem, 4vw, 3.8rem)', fontWeight: '800', color: '#1a1a2e', lineHeight: '1.05' },
  heroSubtitle: { margin: '0 auto', maxWidth: '680px', color: '#52525b', fontSize: '1.08rem', lineHeight: '1.75' },
  formSection: { padding: '1rem 2rem 5rem' },
  formShell: { maxWidth: '860px', margin: '0 auto' },
  progressRow: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '28px' },
  progressItem: { display: 'flex', alignItems: 'center' },
  progressDot: { width: '34px', height: '34px', borderRadius: '50%', border: '1px solid #e4e4e7', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontWeight: '700' },
  progressDotActive: { background: '#FF6B35', borderColor: '#FF6B35', color: '#fff' },
  progressLine: { width: '68px', height: '2px', background: '#e4e4e7' },
  progressLineActive: { background: '#FF6B35' },
  formCard: { background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.06)', padding: '30px' },
  cardHeader: { marginBottom: '24px' },
  stepLabel: { margin: '0 0 8px 0', color: '#FF6B35', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.08em' },
  cardTitle: { margin: 0, fontSize: '1.75rem', color: '#1a1a2e', fontWeight: '800' },
  errorBox: { marginBottom: '20px', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', borderRadius: '14px', padding: '12px 14px' },
  fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' },
  fullWidth: { gridColumn: '1 / -1' },
  label: { display: 'block', marginBottom: '8px', color: '#27272a', fontSize: '0.92rem', fontWeight: '700' },
  input: { width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: '14px', border: '1px solid #e4e4e7', background: '#fff', fontSize: '0.98rem', color: '#1a1a2e', fontFamily: "'Outfit', sans-serif" },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: '14px', border: '1px solid #e4e4e7', background: '#fff', fontSize: '0.98rem', color: '#1a1a2e', resize: 'vertical', fontFamily: "'Outfit', sans-serif", minHeight: '110px' },
  uploadRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '12px' },
  fileHint: { color: '#71717a', fontSize: '0.92rem' },
  questionCard: { marginBottom: '18px', padding: '18px', background: '#fff8f4', borderRadius: '18px', border: '1px solid #fed7c3' },
  actionsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '24px', flexWrap: 'wrap' },
  primaryButton: { border: 'none', borderRadius: '14px', background: '#FF6B35', color: '#fff', padding: '13px 20px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  secondaryButton: { border: '1px solid #d4d4d8', borderRadius: '14px', background: '#fff', color: '#1a1a2e', padding: '11px 16px', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  ghostButton: { border: '1px solid #d4d4d8', borderRadius: '14px', background: '#fff', color: '#3f3f46', padding: '13px 18px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  confirmationBox: { padding: '18px', background: '#f0fdf4', borderRadius: '18px', border: '1px solid #bbf7d0' },
  confirmationBadge: { display: 'inline-block', marginBottom: '14px', padding: '5px 12px', borderRadius: '999px', background: '#dcfce7', color: '#166534', fontWeight: '700', fontSize: '0.85rem' },
  confirmationTitle: { margin: '0 0 10px 0', color: '#14532d', fontSize: '1.5rem', fontWeight: '800' },
  confirmationText: { margin: '0 0 8px 0', color: '#166534', lineHeight: '1.7', fontSize: '1rem' },
  confirmationMeta: { margin: 0, color: '#15803d', fontWeight: '700' },
};

export default PostJobPage;
