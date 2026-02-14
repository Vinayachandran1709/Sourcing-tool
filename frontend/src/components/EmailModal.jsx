import React, { useState, useEffect } from 'react';
import { X, Mail, Loader, AlertCircle, Settings } from 'lucide-react';
import { sendBulkEmails, getEmailUsage } from '../services/api';
import EmailSettingsModal from './EmailSettingsModal';
import { useAuth } from '../contexts/AuthContext';

const EmailModal = ({ onClose, selectedProfiles, profiles, onSend, onSuccess }) => {
  const { incrementUsage } = useAuth();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Support both prop naming patterns
  const activeProfiles = selectedProfiles || profiles || [];
  const handleComplete = onSend || onSuccess;

  // Check cache instantly - no API calls
  const getCachedSettings = () => {
    try {
      const cached = localStorage.getItem('emailSettings');
      if (!cached) return null;
      return JSON.parse(cached);
    } catch (e) {
      return null;
    }
  };

  const settings = getCachedSettings();
  const hasSettings = settings?.sender_email && settings?.sender_name && settings?.email_subject && settings?.email_template;

  // Fetch usage in background only (no blocking)
  useEffect(() => {
    getEmailUsage().then(data => {
      // Usage data available but doesn't block UI
    }).catch(err => {
      console.error('Usage fetch error:', err);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!hasSettings) {
      setError('Please configure email settings first');
      setShowSettingsModal(true);
      return;
    }

    setSending(true);

    try {
      const result = await sendBulkEmails({
        profile_ids: activeProfiles.map(p => p.id)
      });

      // Increment usage
      incrementUsage('email', result.sent || activeProfiles.length);

      // Close and callback
      handleComplete && handleComplete(result);
      onClose();

    } catch (error) {
      console.error('Send error:', error);
      setError(error.response?.data?.message || 'Failed to send emails. Please try again.');
      setSending(false);
    }
  };

  return (
    <>
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <h2 style={styles.title}>Send Bulk Emails</h2>
            <div style={styles.headerButtons}>
              <button
                onClick={() => setShowSettingsModal(true)}
                style={styles.settingsButton}
                title="Email Settings"
              >
                <Settings size={20} />
              </button>
              <button onClick={onClose} style={styles.closeButton}>
                <X size={24} />
              </button>
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={20} color="#dc2626" />
              <span style={styles.errorText}>{error}</span>
            </div>
          )}

          {!hasSettings && (
            <div style={styles.setupBox}>
              <div style={styles.setupIcon}>
                <Settings size={32} color="#FF6B35" />
              </div>
              <h3 style={styles.setupTitle}>Set up your email first</h3>
              <p style={styles.setupText}>
                Configure your sender email, name, subject line, and template.
              </p>
              <button
                onClick={() => setShowSettingsModal(true)}
                style={styles.setupButton}
              >
                <Settings size={18} />
                Configure Email Settings
              </button>
            </div>
          )}

          {hasSettings && (
            <div style={styles.info}>
              <Mail size={20} color="#4f46e5" />
              <span>Ready to send to {activeProfiles.length} developers</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.infoText}>
              {hasSettings ? (
                <>
                  <p>Your email settings are configured</p>
                  <p style={styles.hint}>
                    Emails will be sent using your saved template and settings.
                    Click the Settings button above to modify them.
                  </p>
                </>
              ) : (
                <p style={{ ...styles.hint, margin: 0 }}>
                  Configure your email settings to get started.
                </p>
              )}
            </div>

            <div style={styles.actions}>
              <button type="button" onClick={onClose} style={styles.cancelButton}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !hasSettings}
                style={{
                  ...styles.sendButton,
                  opacity: !hasSettings ? 0.5 : 1,
                  cursor: !hasSettings ? 'not-allowed' : 'pointer'
                }}
              >
                {sending ? (
                  <>
                    <Loader size={20} />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Mail size={20} />
                    <span>Send {activeProfiles.length} Emails</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <EmailSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSuccess={() => {
          setShowSettingsModal(false);
          window.location.reload(); // Reload to refresh cache
        }}
      />
    </>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0,
  },
  headerButtons: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  settingsButton: {
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    padding: '8px',
    cursor: 'pointer',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 1.5rem',
    backgroundColor: '#fef2f2',
    borderBottom: '1px solid #fecaca',
  },
  errorText: {
    fontSize: '0.875rem',
    color: '#991b1b',
    fontWeight: '500',
  },
  setupBox: {
    padding: '2rem 1.5rem',
    textAlign: 'center',
    backgroundColor: '#fff7ed',
    borderBottom: '1px solid #fed7aa',
  },
  setupIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    boxShadow: '0 2px 8px rgba(255,107,53,0.15)',
  },
  setupTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: '0 0 0.5rem',
  },
  setupText: {
    fontSize: '0.875rem',
    color: '#6b7280',
    lineHeight: '1.6',
    margin: '0 0 1.25rem',
    maxWidth: '400px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  setupButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  info: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 1.5rem',
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  form: {
    padding: '1.5rem',
  },
  infoText: {
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  hint: {
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1.5rem',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#374151',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  sendButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

export default EmailModal;
