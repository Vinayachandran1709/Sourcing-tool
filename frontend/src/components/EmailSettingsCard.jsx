import React, { useState, useEffect } from 'react';
import { Mail, Save, CheckCircle, AlertCircle, User, FileText, Link as LinkIcon, Loader } from 'lucide-react';
import { updateEmailSettings, getEmailUsage, getEmailSettings } from '../services/api';
import { trackEmailSettingsSaved } from '../services/analytics';

const DEFAULT_TEMPLATE = `Hi {{name}},

I came across your GitHub profile and was impressed by your work.

We're looking for talented developers to join our team, and I think you'd be a great fit for our projects.

Would you be open to a quick chat about this opportunity?

Best regards`;

const EmailSettingsCard = () => {
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailTemplate, setEmailTemplate] = useState(DEFAULT_TEMPLATE);
  const [replyMethod, setReplyMethod] = useState('email');
  const [replyLink, setReplyLink] = useState('');
  const [emailUsage, setEmailUsage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Load from cache instantly for immediate UI update
    const cached = localStorage.getItem('emailSettings');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setSenderEmail(parsed.sender_email || '');
        setSenderName(parsed.sender_name || '');
        setEmailSubject(parsed.email_subject || '');
        setEmailTemplate(parsed.email_template || DEFAULT_TEMPLATE);
        setReplyMethod(parsed.reply_method || 'email');
        setReplyLink(parsed.reply_link || '');
      } catch (e) {
        console.error('Cache error:', e);
      }
    }

    // Fetch from backend (source of truth) to ensure persistence across sessions/plan changes
    try {
      const backendSettings = await getEmailSettings();

      // Update state with backend data
      setSenderEmail(backendSettings.sender_email || '');
      setSenderName(backendSettings.sender_name || '');
      setEmailSubject(backendSettings.email_subject || '');
      setEmailTemplate(backendSettings.email_template || DEFAULT_TEMPLATE);
      setReplyMethod(backendSettings.reply_method || 'email');
      setReplyLink(backendSettings.reply_link || '');

      // Sync cache with backend data
      const settingsToCache = {
        sender_email: backendSettings.sender_email || '',
        sender_name: backendSettings.sender_name || '',
        email_subject: backendSettings.email_subject || '',
        email_template: backendSettings.email_template || DEFAULT_TEMPLATE,
        reply_method: backendSettings.reply_method || 'email',
        reply_link: backendSettings.reply_link || ''
      };
      localStorage.setItem('emailSettings', JSON.stringify(settingsToCache));
    } catch (err) {
      console.error('Failed to load settings from backend:', err);
      // Keep using cached data if backend fetch fails
    }

    // Fetch usage in background
    getEmailUsage().then(usage => {
      setEmailUsage(usage.usage);
    }).catch(err => {
      console.error('Usage fetch error:', err);
    });
  };

  const showMessage = (type, text, duration = 2500) => {
    if (type === 'success') {
      setSuccessMessage(text);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), duration);
    } else if (type === 'error') {
      setErrorMessage(text);
      setShowErrorModal(true);
      setTimeout(() => setShowErrorModal(false), duration);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!senderEmail || !senderName || !emailSubject || !emailTemplate) {
      showMessage('error', 'Please fill in all required fields');
      return;
    }

    if (!senderEmail.includes('@')) {
      showMessage('error', 'Please enter a valid email address');
      return;
    }

    if (replyMethod === 'form' && !replyLink) {
      showMessage('error', 'Please enter an application form URL');
      return;
    }

    const settingsData = {
      sender_email: senderEmail,
      sender_name: senderName,
      email_subject: emailSubject,
      email_template: emailTemplate,
      reply_method: replyMethod,
      reply_link: replyLink
    };

    setSaving(true);

    try {
      // Save to backend
      await updateEmailSettings(settingsData);

      // Update cache
      localStorage.setItem('emailSettings', JSON.stringify(settingsData));

      // Track settings saved
      trackEmailSettingsSaved(settingsData);

      showMessage('success', 'Changes saved successfully!', 2000);
    } catch (error) {
      console.error('Save error:', error);
      showMessage('error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    setResetting(true);

    try {
      // Reset template to default
      const settingsData = {
        sender_email: senderEmail,
        sender_name: senderName,
        email_subject: emailSubject,
        email_template: DEFAULT_TEMPLATE,
        reply_method: replyMethod,
        reply_link: replyLink
      };

      // Save to backend
      await updateEmailSettings(settingsData);

      // Update cache
      localStorage.setItem('emailSettings', JSON.stringify(settingsData));

      // Update local state
      setEmailTemplate(DEFAULT_TEMPLATE);

      showMessage('success', 'Template reset to default successfully!', 2000);
    } catch (error) {
      console.error('Reset error:', error);
      showMessage('error', 'Failed to reset template. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Mail size={24} color="#FF6B35" />
          <div>
            <h3 style={styles.title}>Email Settings</h3>
            <p style={styles.subtitle}>Configure your email template and sender details</p>
          </div>
        </div>
      </div>

      {/* Email Usage Banner */}
      {emailUsage && (
        <div style={styles.usageBanner}>
          <Mail size={18} color="#4f46e5" />
          <span style={styles.usageText}>
            {emailUsage.used}/{emailUsage.limit === -1 ? '∞' : emailUsage.limit} emails used this month
            {emailUsage.limit !== -1 && ` • ${emailUsage.remaining} remaining`}
          </span>
        </div>
      )}

      <div style={styles.content}>
        {/* Sender Email */}
        <div style={styles.field}>
          <label style={styles.label}>
            <Mail size={16} />
            Sender Email Address <span style={styles.required}>*</span>
          </label>
          <input
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            placeholder="your-email@company.com"
            style={styles.input}
          />
          <p style={styles.hint}>
            Emails sent from noreply@talentbox.co with replies directed to this email
          </p>
        </div>

        {/* Sender Name */}
        <div style={styles.field}>
          <label style={styles.label}>
            <User size={16} />
            Your Full Name <span style={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="John Doe"
            style={styles.input}
          />
          <p style={styles.hint}>
            This name will appear in the email sender field
          </p>
        </div>

        {/* Email Subject */}
        <div style={styles.field}>
          <label style={styles.label}>
            <FileText size={16} />
            Email Subject <span style={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Exciting opportunity at [Your Company]"
            style={styles.input}
          />
        </div>

        {/* Email Template */}
        <div style={styles.field}>
          <label style={styles.label}>
            <FileText size={16} />
            Email Template <span style={styles.required}>*</span>
          </label>
          <textarea
            value={emailTemplate}
            onChange={(e) => setEmailTemplate(e.target.value)}
            rows={10}
            style={styles.textarea}
            placeholder="Write your email template here..."
          />
          <div style={styles.templateInfo}>
            <div style={styles.variablesBox}>
              <p style={styles.variablesTitle}>Available Variables:</p>
              <div style={styles.variablesGrid}>
                <code style={styles.variableTag}>{'{{name}}'}</code>
              </div>
              <p style={styles.variablesNote}>
                <strong>{'{{name}}'}</strong> - Automatically replaced with the developer's first name from their GitHub profile
              </p>
              <p style={styles.variablesNote}>
                💡 More email variables coming soon! (GitHub username, primary language, top repo, etc.)
              </p>
            </div>
          </div>
        </div>

        {/* Reply Method */}
        <div style={styles.field}>
          <label style={styles.label}>How should developers respond?</label>
          <div style={styles.radioGroup}>
            <label style={{
              ...styles.radioLabel,
              ...(replyMethod === 'email' ? styles.radioLabelSelected : {})
            }}>
              <input
                type="radio"
                checked={replyMethod === 'email'}
                onChange={() => {
                  setReplyMethod('email');
                  setReplyLink('');
                }}
                style={styles.radio}
              />
              <div>
                <div style={styles.radioTitle}>Reply via Email</div>
                <div style={styles.radioDesc}>They'll reply directly to your email address</div>
              </div>
            </label>

            <label style={{
              ...styles.radioLabel,
              ...(replyMethod === 'form' ? styles.radioLabelSelected : {})
            }}>
              <input
                type="radio"
                checked={replyMethod === 'form'}
                onChange={() => setReplyMethod('form')}
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
        {replyMethod === 'form' && (
          <div style={styles.field}>
            <label style={styles.label}>
              <LinkIcon size={16} />
              Application Form URL <span style={styles.required}>*</span>
            </label>
            <input
              type="url"
              value={replyLink}
              onChange={(e) => setReplyLink(e.target.value)}
              placeholder="https://yourcompany.com/careers/apply"
              style={styles.input}
            />
            <p style={styles.hint}>
              We'll automatically add tracking parameters and highlight this URL in emails
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button
            onClick={resetToDefault}
            disabled={resetting || saving}
            style={{
              ...styles.resetButton,
              opacity: (resetting || saving) ? 0.6 : 1,
              cursor: (resetting || saving) ? 'not-allowed' : 'pointer'
            }}
          >
            {resetting ? (
              <>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Resetting...</span>
              </>
            ) : (
              'Reset to Default'
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || resetting}
            style={{
              ...styles.saveButton,
              opacity: (saving || resetting) ? 0.8 : 1,
              cursor: (saving || resetting) ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? (
              <>
                <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.successModal}>
            <div style={styles.successIcon}>
              <CheckCircle size={48} color="#10b981" />
            </div>
            <h3 style={styles.successTitle}>{successMessage}</h3>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.errorModal}>
            <div style={styles.errorIcon}>
              <AlertCircle size={48} color="#ef4444" />
            </div>
            <h3 style={styles.errorTitle}>{errorMessage}</h3>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #f3f4f6',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },

  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
  },

  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '0.25rem 0 0 0',
  },

  usageBanner: {
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

  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeIn 0.2s ease-in-out',
  },

  successModal: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '2.5rem 3rem',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'slideIn 0.3s ease-out',
    minWidth: '400px',
  },

  successIcon: {
    marginBottom: '1.5rem',
    display: 'flex',
    justifyContent: 'center',
  },

  successTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#10b981',
    margin: 0,
  },

  errorModal: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '2.5rem 3rem',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'slideIn 0.3s ease-out',
    minWidth: '400px',
  },

  errorIcon: {
    marginBottom: '1.5rem',
    display: 'flex',
    justifyContent: 'center',
  },

  errorTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#ef4444',
    margin: 0,
  },

  content: {
    padding: '1.5rem',
  },

  field: {
    marginBottom: '1.5rem',
  },

  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.5rem',
  },

  required: {
    color: '#dc2626',
  },

  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },

  textarea: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: "'Outfit', sans-serif",
    resize: 'vertical',
    lineHeight: '1.6',
  },

  hint: {
    marginTop: '0.5rem',
    fontSize: '0.8125rem',
    color: '#6b7280',
  },

  templateInfo: {
    marginTop: '1rem',
  },

  variablesBox: {
    padding: '1rem',
    backgroundColor: '#f0f7ff',
    border: '1px solid #dbeafe',
    borderRadius: '8px',
  },

  variablesTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '0.75rem',
  },

  variablesGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },

  variableTag: {
    padding: '0.375rem 0.625rem',
    fontSize: '0.8125rem',
    backgroundColor: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    color: '#4f46e5',
    fontWeight: '600',
    fontFamily: "'Courier New', monospace",
  },

  variablesNote: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    fontStyle: 'italic',
    margin: 0,
  },

  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },

  radioLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  radioLabelSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#fff7ed',
  },

  radio: {
    marginTop: '0.125rem',
    cursor: 'pointer',
    width: '18px',
    height: '18px',
    flexShrink: 0,
  },

  radioTitle: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.25rem',
  },

  radioDesc: {
    fontSize: '0.8125rem',
    color: '#6b7280',
  },

  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #f3f4f6',
  },

  resetButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    fontSize: '0.9375rem',
    fontWeight: '600',
    background: '#fff',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },

  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    fontSize: '0.9375rem',
    fontWeight: '600',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },
};

// Hover effects and animations
if (!document.getElementById('email-settings-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'email-settings-styles';
  styleSheet.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from {
        transform: translateY(-30px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    input:focus, textarea:focus {
      outline: none;
      border-color: #FF6B35 !important;
      box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
    }

    button[style*="resetButton"]:hover:not(:disabled) {
      border-color: #9ca3af !important;
      color: #1a1a1a !important;
    }

    button[style*="saveButton"]:hover:not(:disabled) {
      background: #ff5722 !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
    }

    label[style*="radioLabel"]:hover {
      border-color: #FF6B35 !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default EmailSettingsCard;
