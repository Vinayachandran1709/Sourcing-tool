import React, { useState, useEffect } from 'react';
import { X, Mail, User, FileText, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { getEmailSettings, updateEmailSettings } from '../services/api';

const EmailSettingsModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    sender_email: '',
    sender_name: '',
    email_subject: '',
    email_template: '',
    reply_method: 'email',
    reply_link: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await getEmailSettings();
      setFormData({
        sender_email: settings.sender_email || '',
        sender_name: settings.sender_name || '',
        email_subject: settings.email_subject || '',
        email_template: settings.email_template || 'Hi {{name}},\n\nI came across your profile and was impressed by your work.\n\nWould love to discuss an opportunity.\n\nBest regards',
        reply_method: settings.reply_method || 'email',
        reply_link: settings.reply_link || ''
      });
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    
    // Validation
    if (!formData.sender_email) {
      setError('Please enter your email address');
      return;
    }
    if (!formData.sender_name) {
      setError('Please enter your name');
      return;
    }
    if (!formData.email_subject) {
      setError('Please enter an email subject');
      return;
    }
    if (!formData.email_template) {
      setError('Please enter an email template');
      return;
    }
    if (formData.reply_method === 'form' && !formData.reply_link) {
      setError('Please enter an application form URL');
      return;
    }

    setIsSaving(true);
    try {
      await updateEmailSettings(formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Email Settings</h2>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div style={styles.loading}>Loading settings...</div>
        ) : (
          <>
            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div style={styles.form}>
              {/* Sender Email */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <Mail size={16} />
                  Your Email Address
                </label>
                <input
                  type="email"
                  value={formData.sender_email}
                  onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                  placeholder="yourname@company.com"
                  style={styles.input}
                />
                <p style={styles.hint}>Developers will see replies sent to this email</p>
              </div>

              {/* Sender Name */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <User size={16} />
                  Your Name
                </label>
                <input
                  type="text"
                  value={formData.sender_name}
                  onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                  placeholder="John Doe"
                  style={styles.input}
                />
              </div>

              {/* Email Subject */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <FileText size={16} />
                  Email Subject
                </label>
                <input
                  type="text"
                  value={formData.email_subject}
                  onChange={(e) => setFormData({ ...formData, email_subject: e.target.value })}
                  placeholder="Exciting opportunity at [Your Company]"
                  style={styles.input}
                />
              </div>

              {/* Email Template */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <FileText size={16} />
                  Email Template
                </label>
                <textarea
                  value={formData.email_template}
                  onChange={(e) => setFormData({ ...formData, email_template: e.target.value })}
                  placeholder="Hi {{name}},&#10;&#10;I came across your profile..."
                  style={styles.textarea}
                  rows={8}
                />
                <p style={styles.hint}>Use {'{'}{'{'}<strong>name</strong>{'}'}{'}'}  for personalization</p>
              </div>

              {/* Reply Method */}
              <div style={styles.formGroup}>
                <label style={styles.label}>How should developers respond?</label>
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={formData.reply_method === 'email'}
                      onChange={() => setFormData({ ...formData, reply_method: 'email', reply_link: '' })}
                      style={styles.radio}
                    />
                    <div>
                      <div style={styles.radioTitle}>Reply via Email</div>
                      <div style={styles.radioDesc}>They'll reply directly to your email</div>
                    </div>
                  </label>

                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={formData.reply_method === 'form'}
                      onChange={() => setFormData({ ...formData, reply_method: 'form' })}
                      style={styles.radio}
                    />
                    <div>
                      <div style={styles.radioTitle}>Apply via Form</div>
                      <div style={styles.radioDesc}>Direct them to your application page</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Application Form URL (conditional) */}
              {formData.reply_method === 'form' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <LinkIcon size={16} />
                    Application Form URL
                  </label>
                  <input
                    type="url"
                    value={formData.reply_link}
                    onChange={(e) => setFormData({ ...formData, reply_link: e.target.value })}
                    placeholder="https://yourcompany.com/careers/apply"
                    style={styles.input}
                  />
                  <p style={styles.hint}>We'll automatically add tracking parameters</p>
                </div>
              )}
            </div>

            <div style={styles.footer}>
              <button onClick={onClose} style={styles.cancelBtn} disabled={isSaving}>
                Cancel
              </button>
              <button onClick={handleSave} style={styles.saveBtn} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
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
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 24px 16px',
    borderBottom: '1px solid #e5e7eb'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: 0
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: '#6b7280',
    display: 'flex'
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280'
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '16px 24px',
    padding: '12px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px'
  },
  form: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a1a'
  },
  input: {
    padding: '10px 12px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: "'Outfit', sans-serif",
    width: '100%',
    boxSizing: 'border-box'
  },
  textarea: {
    padding: '10px 12px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: "'Outfit', sans-serif",
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical'
  },
  hint: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  radio: {
    marginTop: '2px',
    cursor: 'pointer'
  },
  radioTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '2px'
  },
  radioDesc: {
    fontSize: '13px',
    color: '#6b7280'
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb'
  },
  cancelBtn: {
    padding: '10px 20px',
    fontSize: '15px',
    fontWeight: '600',
    background: '#fff',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif"
  },
  saveBtn: {
    padding: '10px 20px',
    fontSize: '15px',
    fontWeight: '600',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif"
  }
};

// Add hover styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  input:focus, textarea:focus {
    outline: none;
    border-color: #FF6B35 !important;
  }
  
  label[style*="radioLabel"]:hover {
    border-color: #FF6B35 !important;
  }
`;
document.head.appendChild(styleSheet);

export default EmailSettingsModal;