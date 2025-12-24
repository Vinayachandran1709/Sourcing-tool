import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(10);

  const paymentId = searchParams.get('payment_id');
  const planName = searchParams.get('plan');

  useEffect(() => {
    window.scrollTo(0, 0);

    // Auto-redirect countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard/subscription');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleDownloadInvoice = () => {
    // TODO: Implement invoice download from backend
    alert('Invoice download will be implemented with backend integration');
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          {/* Success Icon */}
          <div style={styles.iconContainer}>
            <div style={styles.successIcon}>
              <CheckCircle size={64} color="#10b981" />
            </div>
          </div>

          {/* Success Message */}
          <h1 style={styles.title}>Payment Successful!</h1>
          <p style={styles.subtitle}>
            Your subscription to <strong>{planName} Plan</strong> has been activated
          </p>

          {/* Payment Details */}
          <div style={styles.detailsBox}>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Payment ID:</span>
              <span style={styles.detailValue}>{paymentId}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Plan:</span>
              <span style={styles.detailValue}>{planName}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Email:</span>
              <span style={styles.detailValue}>{user?.email}</span>
            </div>
          </div>

          {/* What's Next */}
          <div style={styles.nextSteps}>
            <h3 style={styles.nextStepsTitle}>What's next?</h3>
            <div style={styles.stepsList}>
              <div style={styles.step}>
                <div style={styles.stepNumber}>1</div>
                <div style={styles.stepContent}>
                  <div style={styles.stepTitle}>Access Full Features</div>
                  <div style={styles.stepDesc}>Your account is now upgraded with full access</div>
                </div>
              </div>
              <div style={styles.step}>
                <div style={styles.stepNumber}>2</div>
                <div style={styles.stepContent}>
                  <div style={styles.stepTitle}>Start Searching</div>
                  <div style={styles.stepDesc}>Find and recruit top developers immediately</div>
                </div>
              </div>
              <div style={styles.step}>
                <div style={styles.stepNumber}>3</div>
                <div style={styles.stepContent}>
                  <div style={styles.stepTitle}>Download Invoice</div>
                  <div style={styles.stepDesc}>Receipt sent to your email</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.actions}>
            <button onClick={handleDownloadInvoice} style={styles.downloadBtn}>
              <Download size={20} />
              <span>Download Invoice</span>
            </button>
            <button onClick={() => navigate('/dashboard/search')} style={styles.dashboardBtn}>
              <span>Go to Dashboard</span>
              <ArrowRight size={20} />
            </button>
          </div>

          {/* Auto-redirect Notice */}
          <p style={styles.redirectNote}>
            Redirecting to dashboard in <strong>{countdown}</strong> seconds...
          </p>
        </div>

        {/* Support */}
        <div style={styles.support}>
          <Package size={24} color="#6b7280" />
          <div style={styles.supportText}>
            <p style={styles.supportTitle}>Need help?</p>
            <p style={styles.supportDesc}>
              Contact us at <a href="mailto:support@talentbox.com" style={styles.supportLink}>support@talentbox.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily: "'Outfit', sans-serif",
  },

  container: {
    maxWidth: '600px',
    width: '100%',
  },

  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '3rem',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },

  iconContainer: {
    marginBottom: '2rem',
  },

  successIcon: {
    display: 'inline-flex',
    padding: '1.5rem',
    background: '#d1fae5',
    borderRadius: '50%',
  },

  title: {
    fontSize: '2.25rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '0.75rem',
  },

  subtitle: {
    fontSize: '1.125rem',
    color: '#6b7280',
    marginBottom: '2rem',
  },

  detailsBox: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
    textAlign: 'left',
  },

  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    borderBottom: '1px solid #e5e7eb',
  },

  detailLabel: {
    fontSize: '0.9375rem',
    color: '#6b7280',
    fontWeight: '500',
  },

  detailValue: {
    fontSize: '0.9375rem',
    color: '#1a1a1a',
    fontWeight: '600',
  },

  nextSteps: {
    background: '#fff5f2',
    border: '1px solid #fed7aa',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
    textAlign: 'left',
  },

  nextStepsTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1rem',
  },

  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },

  step: {
    display: 'flex',
    gap: '1rem',
  },

  stepNumber: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#FF6B35',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    fontWeight: '700',
    flexShrink: 0,
  },

  stepContent: {
    flex: 1,
  },

  stepTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.25rem',
  },

  stepDesc: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },

  actions: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
  },

  downloadBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '1rem',
    background: '#fff',
    color: '#1a1a1a',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },

  dashboardBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '1rem',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },

  redirectNote: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },

  support: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    marginTop: '2rem',
    padding: '1.5rem',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
  },

  supportText: {
    textAlign: 'left',
  },

  supportTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#fff',
    margin: '0 0 0.25rem 0',
  },

  supportDesc: {
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.9)',
    margin: 0,
  },

  supportLink: {
    color: '#fff',
    textDecoration: 'underline',
  },
};

// Hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  button[style*="downloadBtn"]:hover {
    border-color: #FF6B35 !important;
    color: #FF6B35 !important;
  }
  
  button[style*="dashboardBtn"]:hover {
    background: #ff5722 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255,107,53,0.3);
  }
`;
document.head.appendChild(styleSheet);

export default PaymentSuccessPage;