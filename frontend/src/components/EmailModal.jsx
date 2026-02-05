import React, { useState, useEffect, useCallback } from 'react';
import { X, Mail, Loader, AlertCircle, Settings } from 'lucide-react';
import { getEmailSettings, getEmailUsage, sendBulkEmails } from '../services/api';
import EmailSettingsModal from './EmailSettingsModal';

const EmailModal = ({ onClose, selectedProfiles, profiles, onSend, onSuccess }) => {
  const [settingsReady, setSettingsReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailUsage, setEmailUsage] = useState(null);
  const [error, setError] = useState(null);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [hasEmailSettings, setHasEmailSettings] = useState(false);

  // Support both prop naming patterns
  const activeProfiles = selectedProfiles || profiles || [];
  const handleComplete = onSend || onSuccess;

  const checkEmailSettings = useCallback(async () => {
    setError(null);

    try {
      const [settings, usage] = await Promise.all([
        getEmailSettings(),
        getEmailUsage()
      ]);

      setEmailUsage(usage.usage);

      const hasSettings = settings.sender_email && settings.email_template;
      setHasEmailSettings(hasSettings);

      if (!hasSettings) {
        setShowSettingsModal(true);
      }

    } catch (error) {
      console.error('Failed to load email settings:', error);
      setError('Failed to load email settings. Please try again.');
    } finally {
      setSettingsReady(true);
    }
  }, []);

  useEffect(() => {
    checkEmailSettings();
  }, [checkEmailSettings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Check if settings are configured
    if (!hasEmailSettings) {
      setError('Please configure email settings first');
      setShowSettingsModal(true);
      return;
    }
    
    // Check if trying to send more than remaining
    if (emailUsage && activeProfiles.length > emailUsage.remaining) {
      setError(`Cannot send ${activeProfiles.length} emails. Only ${emailUsage.remaining} remaining this month.`);
      return;
    }
    
    setSending(true);
    
    try {
      // Send emails (settings already configured on backend)
      const result = await sendBulkEmails({
        profile_ids: activeProfiles.map(p => p.id)
      });
      
      // Success callback
      handleComplete && handleComplete(result);
      onClose();
      
    } catch (error) {
      console.error('Failed to send emails:', error);
      
      // Handle specific error types
      if (error.response?.data?.error === 'EMAIL_LIMIT_EXCEEDED') {
        setError(error.response.data.message);
      } else {
        setError(error.response?.data?.message || 'Failed to send emails. Please try again.');
      }
    } finally {
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
              {/* ✅ NEW: Settings button */}
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

          {/* Email Usage */}
          {emailUsage && (
            <div style={styles.usageBar}>
              <Mail size={20} color="#4f46e5" />
              <span style={styles.usageText}>
                {emailUsage.used}/{emailUsage.limit === -1 ? '∞' : emailUsage.limit} emails used this month
                {emailUsage.limit !== -1 && ` (${emailUsage.remaining} remaining)`}
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={20} color="#dc2626" />
              <span style={styles.errorText}>{error}</span>
            </div>
          )}

          {/* Warning if settings not configured */}
          {settingsReady && !hasEmailSettings && (
            <div style={styles.warningBox}>
              <AlertCircle size={20} color="#f59e0b" />
              <span style={styles.warningText}>
                Please configure your email settings before sending emails
              </span>
            </div>
          )}

          {/* Info Banner */}
          <div style={styles.info}>
            <Mail size={20} color="#4f46e5" />
            <span>Ready to send to {activeProfiles.length} developers</span>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.infoText}>
              {settingsReady && hasEmailSettings ? (
                <>
                  <p>Your email settings are configured</p>
                  <p style={styles.hint}>
                    Emails will be sent using your saved template and settings.
                    Click the Settings button above to modify them.
                  </p>
                </>
              ) : (
                <p style={{ ...styles.hint, margin: 0 }}>
                  {settingsReady ? 'Configure your email settings to get started.' : 'Checking email settings...'}
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={styles.actions}>
              <button type="button" onClick={onClose} style={styles.cancelButton}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !settingsReady || !hasEmailSettings || (emailUsage && activeProfiles.length > emailUsage.remaining)}
                style={{
                  ...styles.sendButton,
                  opacity: (!settingsReady || !hasEmailSettings || (emailUsage && activeProfiles.length > emailUsage.remaining)) ? 0.5 : 1,
                  cursor: (!settingsReady || !hasEmailSettings || (emailUsage && activeProfiles.length > emailUsage.remaining)) ? 'not-allowed' : 'pointer'
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

      {/* ✅ NEW: Email Settings Modal */}
      <EmailSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSuccess={() => {
          setHasEmailSettings(true);
          setShowSettingsModal(false);
          checkEmailSettings(); // Reload settings
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
  usageBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 1.5rem',
    backgroundColor: '#eff6ff',
    borderBottom: '1px solid #dbeafe',
  },
  usageText: {
    fontSize: '0.875rem',
    color: '#1e40af',
    fontWeight: '600',
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
  warningBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 1.5rem',
    backgroundColor: '#fffbeb',
    borderBottom: '1px solid #fde68a',
  },
  warningText: {
    fontSize: '0.875rem',
    color: '#92400e',
    fontWeight: '500',
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