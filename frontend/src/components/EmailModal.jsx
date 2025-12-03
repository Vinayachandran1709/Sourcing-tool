import React, { useState } from 'react';
import { X, Mail, Loader } from 'lucide-react';

const EmailModal = ({ isOpen, onClose, selectedProfiles, onSend }) => {
  const [formData, setFormData] = useState({
    subject: '',
    body: 'Hi {{name}},\n\nI came across your GitHub profile and was impressed by your work.\n\nWe have an exciting opportunity that matches your skills.\n\nWould you be open to a quick chat?\n\nBest regards',
  });
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await onSend(formData);
      onClose();
      setFormData({ subject: '', body: '' });
    } catch (error) {
      console.error('Failed to send emails:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Send Bulk Emails</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.info}>
          <Mail size={20} color="#4f46e5" />
          <span>Sending to {selectedProfiles.length} developers</span>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Exciting Python Developer Role"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Email Body <span style={styles.hint}>(Use {'{{name}}'} for personalization)</span>
            </label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={10}
              style={styles.textarea}
              required
            />
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={sending} style={styles.sendButton}>
              {sending ? (
                <>
                  <Loader size={20} />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail size={20} />
                  <span>Send Emails</span>
                </>
              )}
            </button>
          </div>
        </form>
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
  info: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 1.5rem',
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    fontSize: '0.875rem',
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
  hint: {
    color: '#6b7280',
    fontWeight: 'normal',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '1rem',
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