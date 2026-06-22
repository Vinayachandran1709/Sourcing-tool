import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { triggerCandidateImport } from '../services/candidateApi';
import { Loader2, CheckCircle2, XCircle, SkipForward } from 'lucide-react';

const IMPORT_STEPS = [
  'Analyzing your GitHub profile...',
  'Parsing your resume...',
  'Fetching portfolio data...',
  'Building your developer profile...',
];

const CandidateImportPage = () => {
  const [status, setStatus] = useState('loading'); // loading, complete, error
  const [results, setResults] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Animation for steps
    if (status === 'loading') {
      const interval = setInterval(() => {
        setCurrentStep((prev) => (prev < IMPORT_STEPS.length - 1 ? prev + 1 : prev));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [status]);

  useEffect(() => {
    // Only trigger once
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    const runImport = async () => {
      try {
        const result = await triggerCandidateImport();
        setResults(result);
        setStatus('complete');
        setCurrentStep(IMPORT_STEPS.length - 1);
      } catch (err) {
        console.error("Import failed:", err);
        setStatus('error');
      }
    };

    runImport();
  }, []);

  const handleContinue = () => {
    navigate('/candidate/dashboard');
  };

  const renderResultItem = (label, resultKey) => {
    if (!results) return null;
    
    // If it was successful
    if (results[resultKey]) {
      return (
        <div style={styles.resultItem}>
          <CheckCircle2 size={20} color="#10b981" />
          <span>{label} analyzed</span>
        </div>
      );
    }
    
    // If it had an error specific to this
    const hasError = results.errors && results.errors.some(e => e.toLowerCase().includes(resultKey));
    if (hasError) {
      return (
        <div style={styles.resultItem}>
          <XCircle size={20} color="#ef4444" />
          <span>{label} error</span>
        </div>
      );
    }
    
    // Otherwise skipped
    return (
      <div style={styles.resultItem}>
        <SkipForward size={20} color="#9ca3af" />
        <span style={{ color: '#6b7280' }}>{label} skipped</span>
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.card}>
          {status === 'loading' && (
            <div style={styles.loadingState}>
              <div style={styles.spinnerWrapper}>
                <Loader2 size={48} color="#FF6B35" style={styles.spinner} />
              </div>
              <h2 style={styles.title}>Creating your profile...</h2>
              <p style={styles.stepText}>{IMPORT_STEPS[currentStep]}</p>
              <p style={styles.disclaimer}>This usually takes 15-30 seconds. Please don't close this page.</p>
            </div>
          )}

          {status === 'complete' && (
            <div style={styles.completeState}>
              <div style={styles.successIconWrapper}>
                <CheckCircle2 size={64} color="#10b981" />
              </div>
              <h2 style={styles.title}>Profile Built Successfully!</h2>
              
              <div style={styles.resultsBox}>
                {renderResultItem("GitHub Profile", "github")}
                {renderResultItem("Resume", "resume")}
                {renderResultItem("Portfolio", "portfolio")}
              </div>

              {results && results.errors && results.errors.length > 0 && (
                <div style={styles.warningsBox}>
                  <p style={{ fontWeight: '600', margin: '0 0 8px 0' }}>Notes:</p>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {results.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={handleContinue} style={styles.ctaBtn}>
                View Your Profile →
              </button>
            </div>
          )}

          {status === 'error' && (
            <div style={styles.errorState}>
              <div style={styles.errorIconWrapper}>
                <XCircle size={64} color="#ef4444" />
              </div>
              <h2 style={styles.title}>Something went wrong</h2>
              <p style={styles.stepText}>We encountered an error while building your profile.</p>
              <button onClick={handleContinue} style={styles.ctaBtn}>
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
      <style>
        {`
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}
      </style>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: '#fafafa', fontFamily: "'Outfit', sans-serif" },
  container: { maxWidth: '600px', margin: '80px auto', padding: '0 20px' },
  card: { background: '#fff', borderRadius: '16px', padding: '48px 32px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center' },
  loadingState: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  completeState: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  errorState: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  spinnerWrapper: { marginBottom: '24px' },
  spinner: { animation: 'spin 2s linear infinite' },
  successIconWrapper: { marginBottom: '24px' },
  errorIconWrapper: { marginBottom: '24px' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#1a1a1a', margin: '0 0 16px 0' },
  stepText: { fontSize: '1.1rem', color: '#4b5563', margin: '0 0 24px 0', minHeight: '28px' },
  disclaimer: { fontSize: '0.875rem', color: '#9ca3af', marginTop: '32px' },
  resultsBox: { background: '#f9fafb', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '300px', margin: '0 auto 32px auto', display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' },
  resultItem: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.05rem', fontWeight: '500', color: '#374151' },
  warningsBox: { background: '#fef2f2', color: '#991b1b', padding: '16px', borderRadius: '8px', marginBottom: '32px', textAlign: 'left', fontSize: '0.9rem', width: '100%' },
  ctaBtn: { padding: '14px 32px', background: '#FF6B35', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s', width: '100%', maxWidth: '300px' }
};

export default CandidateImportPage;
