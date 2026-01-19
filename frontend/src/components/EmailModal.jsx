import React, { useState, useEffect, useCallback } from 'react';
import { X, Mail, Loader, AlertCircle } from 'lucide-react';
import { getEmailSettings, updateSenderEmail, getEmailUsage, sendBulkEmails } from '../services/api';

const EmailModal = ({ isOpen, onClose, selectedProfiles, onSend }) => {
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [emailUsage, setEmailUsage] = useState(null);
  const [error, setError] = useState(null);

    const loadEmailSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load settings and usage in parallel
      const [settings, usage] = await Promise.all([
        getEmailSettings(),
        getEmailUsage()
      ]);
      
      setEmailUsage(usage.usage);
      
      // Check if first time (no sender email)
      if (!settings.has_sender_email) {
        setIsFirstTime(true);
        setSenderEmail('');
      } else {
        setIsFirstTime(false);
        setSenderEmail(settings.sender_email);
      }
      
      // Pre-fill template
      setBody(settings.email_template);
      
      // Set default subject if empty
      if (!subject) {
        setSubject('Exciting opportunity at [Your Company]');
      }
      
    } catch (error) {
      console.error('Failed to load email settings:', error);
      setError('Failed to load email settings. Please try again.');
    } finally {
        setLoading(false);
    }
    }, [subject]);
    
  useEffect(() => {
    if (isOpen) {
      loadEmailSettings();
    }
  }, [isOpen, loadEmailSettings]);



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!senderEmail || !subject || !body) {
      setError('Please fill in all fields');
      return;
    }
    
    if (!senderEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Check if trying to send more than remaining
    if (emailUsage && selectedProfiles.length > emailUsage.remaining) {
      setError(`Cannot send ${selectedProfiles.length} emails. Only ${emailUsage.remaining} remaining this month.`);
      return;
    }
    
    setSending(true);
    
    try {
      // If first time, save sender email
      if (isFirstTime) {
        await updateSenderEmail(senderEmail);
      }
      
      // Send emails
      const result = await sendBulkEmails({
        profile_ids: selectedProfiles.map(p => p.id),
        subject,
        body
      });
      
      // Success callback
      onSend(result);
      onClose();
      
    } catch (error) {
      console.error('Failed to send emails:', error);
      
      // Handle specific error types
      if (error.response?.data?.error === 'EMAIL_LIMIT_EXCEEDED') {
        setError(error.response.data.message);
      } else if (error.response?.data?.error === 'SENDER_EMAIL_NOT_SET') {
        setError('Please enter your sender email address');
      } else {
        setError(error.response?.data?.message || 'Failed to send emails. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Send Bulk Emails</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <Loader size={32} color="#4f46e5" />
            <p style={styles.loadingText}>Loading email settings...</p>
          </div>
        ) : (
          <>
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

            {/* Info Banner */}
            <div style={styles.info}>
              <Mail size={20} color="#4f46e5" />
              <span>Sending to {selectedProfiles.length} developers</span>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              {/* Sender Email (First Time or Always Visible) */}
              <div style={styles.field}>
                <label style={styles.label}>
                  From: {isFirstTime && <span style={styles.required}>*</span>}
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="your-email@company.com"
                  style={styles.input}
                  disabled={!isFirstTime}
                  required
                />
                {isFirstTime && (
                  <p style={styles.hint}>
                    This will be saved and used for future emails
                  </p>
                )}
                {!isFirstTime && (
                  <p style={styles.hint}>
                    To change sender email, go to Subscription settings
                  </p>
                )}
              </div>

              {/* Subject */}
              <div style={styles.field}>
                <label style={styles.label}>
                  Subject <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Exciting Python Developer Role"
                  style={styles.input}
                  required
                />
              </div>

              {/* Body (Template) */}
              <div style={styles.field}>
                <label style={styles.label}>
                  Email Body <span style={styles.required}>*</span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  style={styles.textarea}
                  required
                />
                <p style={styles.hint}>
                  💡 Use variables: {'{{name}}'}, {'{{github_username}}'}, {'{{primary_language}}'}, {'{{top_repo}}'}
                </p>
                <p style={styles.hint}>
                  To change default template, go to Subscription settings
                </p>
              </div>

              {/* Actions */}
              <div style={styles.actions}>
                <button type="button" onClick={onClose} style={styles.cancelButton}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={sending || (emailUsage && selectedProfiles.length > emailUsage.remaining)} 
                  style={styles.sendButton}
                >
                  {sending ? (
                    <>
                      <Loader size={20} />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={20} />
                      <span>Send {selectedProfiles.length} Emails</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
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
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '3rem',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '0.875rem',
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
  field: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.5rem',
    color: '#374151',
  },
  required: {
    color: '#dc2626',
  },
  hint: {
    marginTop: '0.375rem',
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '1rem',
    fontFamily: 'inherit',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical',
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