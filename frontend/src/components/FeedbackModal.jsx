import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Loader, MessageSquare } from 'lucide-react';
import { submitFeedback } from '../services/api';

const CATEGORIES = [
  { value: 'bug', label: 'Bug / Technical Issue' },
  { value: 'payment', label: 'Payment Issue' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'general', label: 'General Feedback' },
  { value: 'other', label: 'Other' },
];

const FeedbackModal = ({ isOpen, onClose }) => {
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);

  // Slide-in animation
  useEffect(() => {
    if (isOpen) {
      // Small delay for the CSS transition to work
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setCategory('');
      setMessage('');
      setError('');
      setSubmitted(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300); // Wait for slide-out animation
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!category) {
      setError('Please select a category');
      return;
    }
    if (!message || message.trim().length < 10) {
      setError('Message must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback({
        category,
        message: message.trim(),
        page_url: window.location.href,
        browser_info: navigator.userAgent,
      });
      setSubmitted(true);
      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          ...styles.backdrop,
          opacity: visible ? 1 : 0,
        }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        style={{
          ...styles.modal,
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <MessageSquare size={20} color="#FF6B35" />
            <h2 style={styles.title}>Help & Feedback</h2>
          </div>
          <button onClick={handleClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          /* Success State */
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>
              <CheckCircle size={48} color="#10b981" />
            </div>
            <h3 style={styles.successTitle}>Thanks for your feedback!</h3>
            <p style={styles.successText}>We'll review this shortly.</p>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Category */}
            <div style={styles.field}>
              <label style={styles.label}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={styles.select}
              >
                <option value="">Select a category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div style={styles.field}>
              <label style={styles.label}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or suggestion in detail..."
                style={styles.textarea}
                rows={5}
              />
              <span style={styles.charCount}>
                {message.length} / 10 min characters
              </span>
            </div>

            {/* Error */}
            {error && <div style={styles.error}>{error}</div>}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.submitBtn,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </button>

            {/* Footer */}
            <p style={styles.footerText}>
              We typically respond within 1 hour
            </p>
          </form>
        )}
      </div>
    </>
  );
};

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 9998,
    transition: 'opacity 0.3s ease',
  },

  modal: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '400px',
    maxWidth: '100vw',
    height: '100vh',
    backgroundColor: '#ffffff',
    boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Outfit', sans-serif",
    transition: 'transform 0.3s ease',
    overflowY: 'auto',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  title: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1a1a1a',
  },

  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: '#6b7280',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },

  form: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flex: 1,
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
  },

  select: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9rem',
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
    transition: 'border-color 0.2s',
    cursor: 'pointer',
    appearance: 'auto',
  },

  textarea: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9rem',
    color: '#1a1a1a',
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
    resize: 'vertical',
    minHeight: '120px',
    lineHeight: 1.5,
    transition: 'border-color 0.2s',
  },

  charCount: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    textAlign: 'right',
  },

  error: {
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '0.875rem',
  },

  submitBtn: {
    padding: '12px 24px',
    backgroundColor: '#FF6B35',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'opacity 0.2s, transform 0.1s',
  },

  footerText: {
    textAlign: 'center',
    fontSize: '0.8125rem',
    color: '#9ca3af',
    margin: 0,
  },

  successContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: '16px',
  },

  successIcon: {
    animation: 'fadeIn 0.4s ease',
  },

  successTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1a1a1a',
  },

  successText: {
    margin: 0,
    fontSize: '0.9375rem',
    color: '#6b7280',
  },
};

// Add keyframe animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default FeedbackModal;
