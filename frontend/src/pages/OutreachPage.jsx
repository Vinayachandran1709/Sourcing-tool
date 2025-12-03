import React, { useState, useEffect } from 'react';
import { Mail, Loader } from 'lucide-react';
import ProfileCard from '../components/ProfileCard';
import EmailModal from '../components/EmailModal';
import { getSelectedProfiles, sendBulkEmails, toggleProfileSelection } from '../services/api';

const OutreachPage = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadSelectedProfiles();
  }, []);

  const loadSelectedProfiles = async () => {
    setLoading(true);
    try {
      const data = await getSelectedProfiles();
      setProfiles(data);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = async (profileId) => {
    try {
      await toggleProfileSelection(profileId);
      setProfiles(prev => prev.map(p => p.id === profileId ? {...p, selected: !p.selected} : p));
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  const handleSendEmails = async (emailData) => {
    const selectedIds = profiles.filter(p => p.selected).map(p => p.id);
    
    try {
      const result = await sendBulkEmails({
        profile_ids: selectedIds,
        subject: emailData.subject,
        body: emailData.body,
      });
      
      alert(`✅ Emails sent successfully!\nSent: ${result.sent}\nFailed: ${result.failed}`);
      loadSelectedProfiles();
    } catch (error) {
      alert('❌ Failed to send emails. Make sure backend is running and email credentials are configured.');
    }
  };

  const selectedCount = profiles.filter(p => p.selected).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Email Outreach</h1>
          <p style={styles.subtitle}>Send personalized emails to selected developers</p>
        </div>
        
        {selectedCount > 0 && (
          <button onClick={() => setShowModal(true)} style={styles.sendButton}>
            <Mail size={20} />
            <span>Send to {selectedCount} developers</span>
          </button>
        )}
      </div>

      {loading && <div style={styles.loading}>Loading selected profiles...</div>}

      {!loading && profiles.length === 0 && (
        <div style={styles.empty}>
          <Mail size={48} color="#9ca3af" />
          <h2>No profiles selected</h2>
          <p>Go to Search page and select developers to contact</p>
        </div>
      )}

      <div style={styles.grid}>
        {profiles.map(profile => (
          <ProfileCard key={profile.id} profile={profile} onToggleSelect={handleToggleSelect} />
        ))}
      </div>

      <EmailModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        selectedProfiles={profiles.filter(p => p.selected)}
        onSend={handleSendEmails}
      />
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  title: { fontSize: '2rem', fontWeight: 'bold', margin: 0 },
  subtitle: { color: '#6b7280', marginTop: '0.5rem' },
  sendButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: '500', cursor: 'pointer' },
  loading: { textAlign: 'center', padding: '3rem', fontSize: '1.125rem', color: '#6b7280' },
  empty: { textAlign: 'center', padding: '4rem', color: '#6b7280' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' },
};

export default OutreachPage;