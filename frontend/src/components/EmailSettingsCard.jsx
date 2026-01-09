import React, { useState, useEffect } from 'react';
import { Mail, Save, Loader, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { getEmailSettings, updateEmailSettings, getEmailUsage } from '../services/api';

const EmailSettingsCard = () => {
  const [senderEmail, setSenderEmail] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [emailUsage, setEmailUsage] = useState(null);
  const [hasCustomTemplate, setHasCustomTemplate] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [settings, usage] = await Promise.all([
        getEmailSettings(),
        getEmailUsage()
      ]);
      
      setSenderEmail(settings.sender_email || '');
      setEmailTemplate(settings.email_template || '');
      setHasCustomTemplate(settings.has_custom_template);
      setEmailUsage(usage.usage);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage({ type: 'error', text: 'Failed to load email settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!senderEmail || !emailTemplate) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (!senderEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await updateEmailSettings(senderEmail, emailTemplate);
      setMessage({ type: 'success', text: 'Email settings saved successfully!' });
      setHasCustomTemplate(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    const defaultTemplate = `Hi {{name}},

I came across your GitHub profile and was impressed by your work on {{top_repo}}.

We're {{company}}, and we're looking for talented developers to join our team. Your expertise in {{primary_language}} would be a great fit for our current projects.

Would you be open to a quick chat about this opportunity?

Best regards,
{{sender_name}}`;
    
    setEmailTemplate(defaultTemplate);
    setMessage({ type: 'info', text: 'Reset to default template. Click Save to apply.' });
  };

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.loadingContainer}>
          <Loader size={32} color="#FF6B35" />
          <p style={styles.loadingText}>Loading email settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Mail size={24} color="#FF6B35" />
          <div>
            <h3 style={styles.title}>Email Settings</h3>
            <p style={styles.subtitle}>Configure your default email template and sender address</p>
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

      {/* Message */}
      {message && (
        <div style={{
          ...styles.message,
          ...(message.type === 'success' ? styles.messageSuccess : {}),
          ...(message.type === 'error' ? styles.messageError : {}),
          ...(message.type === 'info' ? styles.messageInfo : {})
        }}>
          {message.type === 'success' && <CheckCircle size={18} color="#10b981" />}
          {message.type === 'error' && <AlertCircle size={18} color="#dc2626" />}
          {message.type === 'info' && <Info size={18} color="#3b82f6" />}
          <span>{message.text}</span>
        </div>
      )}

      <div style={styles.content}>
        {/* Sender Email */}
        <div style={styles.field}>
          <label style={styles.label}>
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
            This email will be used as the "From" address for all outreach emails
          </p>
        </div>

        {/* Email Template */}
        <div style={styles.field}>
          <label style={styles.label}>
            Default Email Template <span style={styles.required}>*</span>
          </label>
          <textarea
            value={emailTemplate}
            onChange={(e) => setEmailTemplate(e.target.value)}
            rows={12}
            style={styles.textarea}
            placeholder="Write your default email template here..."
          />
          <div style={styles.templateInfo}>
            <div style={styles.variablesBox}>
              <p style={styles.variablesTitle}>Available Variables:</p>
              <div style={styles.variablesGrid}>
                <code style={styles.variableTag}>{'{{name}}'}</code>
                <code style={styles.variableTag}>{'{{github_username}}'}</code>
                <code style={styles.variableTag}>{'{{primary_language}}'}</code>
                <code style={styles.variableTag}>{'{{top_repo}}'}</code>
                <code style={styles.variableTag}>{'{{location}}'}</code>
                <code style={styles.variableTag}>{'{{company}}'}</code>
                <code style={styles.variableTag}>{'{{sender_name}}'}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button onClick={resetToDefault} style={styles.resetButton}>
            Reset to Default
          </button>
          <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
            {saving ? (
              <>
                <Loader size={18} />
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

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '3rem',
  },

  loadingText: {
    color: '#6b7280',
    fontSize: '0.9375rem',
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

  message: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
  },

  messageSuccess: {
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    borderBottom: '1px solid #bbf7d0',
  },

  messageError: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    borderBottom: '1px solid #fecaca',
  },

  messageInfo: {
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    borderBottom: '1px solid #dbeafe',
  },

  content: {
    padding: '1.5rem',
  },

  field: {
    marginBottom: '1.5rem',
  },

  label: {
    display: 'block',
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

  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #f3f4f6',
  },

  resetButton: {
    display: 'flex',
    alignItems: 'center',
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

// Add hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  input:focus, textarea:focus {
    outline: none;
    border-color: #FF6B35 !important;
    box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
  }
  
  button[style*="resetButton"]:hover {
    border-color: #9ca3af !important;
    color: #1a1a1a !important;
  }
  
  button[style*="saveButton"]:hover:not(:disabled) {
    background: #ff5722 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
  }
  
  button[style*="saveButton"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
document.head.appendChild(styleSheet);

export default EmailSettingsCard;