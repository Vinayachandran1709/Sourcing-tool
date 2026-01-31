import React, { useState, useEffect } from 'react';
import { Star, Download, Trash2, Mail, CheckSquare } from 'lucide-react';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import ProfileCard from '../../components/ProfileCard';
import ProfileDetailModal from '../../components/ProfileDetailModal';
import EmailModal from '../../components/EmailModal';

const SavedProfilesPage = () => {
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [savedProfileIds, setSavedProfileIds] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Load saved profiles from localStorage
  useEffect(() => {
    const loadSavedProfiles = () => {
      const profiles = JSON.parse(localStorage.getItem('savedProfiles') || '[]');
      const ids = JSON.parse(localStorage.getItem('savedProfileIds') || '[]');
      // Initialize with selected: false
      setSavedProfiles(profiles.map(p => ({ ...p, selected: false })));
      setSavedProfileIds(ids);
    };

    loadSavedProfiles();

    // Listen for storage changes (in case profiles are saved from another tab/component)
    window.addEventListener('storage', loadSavedProfiles);
    return () => window.removeEventListener('storage', loadSavedProfiles);
  }, []);

  // Selection handlers
  const handleProfileSelect = (profileId) => {
    setSavedProfiles(prev =>
      prev.map(p => p.id === profileId ? { ...p, selected: !p.selected } : p)
    );
  };

  const handleSelectAll = () => {
    const allSelected = savedProfiles.every(p => p.selected);
    setSavedProfiles(savedProfiles.map(p => ({ ...p, selected: !allSelected })));
  };

  const handleDeselectAll = () => {
    setSavedProfiles(savedProfiles.map(p => ({ ...p, selected: false })));
  };

  const handleToggleSave = (profile) => {
    // Remove from saved
    const updatedProfiles = savedProfiles.filter(p => p.id !== profile.id);
    const updatedIds = savedProfileIds.filter(id => id !== profile.id);

    setSavedProfiles(updatedProfiles);
    setSavedProfileIds(updatedIds);

    localStorage.setItem('savedProfiles', JSON.stringify(updatedProfiles));
    localStorage.setItem('savedProfileIds', JSON.stringify(updatedIds));
  };

  const handleViewProfile = (profile) => {
    setSelectedProfile(profile);
    setShowDetailModal(true);
  };

  const handleBulkEmail = async () => {
    const selected = savedProfiles.filter(p => p.selected);
    if (selected.length === 0) {
      alert('Please select at least one profile to send emails.');
      return;
    }

    // Check email limits before opening modal
    try {
      const { getEmailUsage } = await import('../../services/api');
      const usageData = await getEmailUsage();

      if (!usageData.usage.can_send) {
        alert(`Email limit reached! You've used ${usageData.usage.used}/${usageData.usage.limit} emails this month. Upgrade to send more.`);
        return;
      }

      if (selected.length > usageData.usage.remaining) {
        alert(`Cannot send ${selected.length} emails. Only ${usageData.usage.remaining} emails remaining this month.`);
        return;
      }
    } catch (error) {
      console.error('Failed to check email limits:', error);
      // Continue anyway - backend will enforce limits
    }

    setShowEmailModal(true);
  };

  const handleClearAll = () => {
    if (!window.confirm(`Are you sure you want to remove all ${savedProfiles.length} saved profiles?`)) {
      return;
    }

    setSavedProfiles([]);
    setSavedProfileIds([]);
    localStorage.setItem('savedProfiles', JSON.stringify([]));
    localStorage.setItem('savedProfileIds', JSON.stringify([]));
  };

  const handleExportCSV = () => {
    if (savedProfiles.length === 0) return;

    const csv = [
      ['Name', 'GitHub Username', 'Email', 'Location', 'Score', 'Repos', 'Stars', 'Contributions', 'Primary Language'],
      ...savedProfiles.map(p => [
        p.name || p.github_username,
        p.github_username,
        p.email || '',
        p.location || '',
        p.developer_score || 0,
        p.public_repos || 0,
        p.total_stars || 0,
        p.contributions_last_year || 0,
        p.primary_language || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saved-profiles-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const selectedCount = savedProfiles.filter(p => p.selected).length;

  return (
    <div style={styles.page}>
      <DashboardHeader
        title="Saved Profiles"
        subtitle="View and manage your saved developer profiles"
      />

      <div style={styles.container}>
        {/* Header Actions */}
        {savedProfiles.length > 0 && (
          <div style={styles.headerActions}>
            <div style={styles.statsBox}>
              <Star size={20} color="#FFB800" fill="#FFB800" />
              <span style={styles.statsText}>
                {savedProfiles.length} profile{savedProfiles.length !== 1 ? 's' : ''} saved
              </span>
            </div>
            <div style={styles.actionsRight}>
              <button onClick={handleExportCSV} style={styles.exportBtn}>
                <Download size={18} />
                <span>Export CSV</span>
              </button>
              <button onClick={handleClearAll} style={styles.clearBtn}>
                <Trash2 size={18} />
                <span>Clear All</span>
              </button>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedCount > 0 && (
          <div style={styles.bulkActions}>
            <div style={styles.bulkActionsLeft}>
              <CheckSquare size={20} color="#FF6B35" />
              <span style={styles.bulkActionsText}>
                {selectedCount} profile{selectedCount !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div style={styles.bulkActionsRight}>
              <button onClick={handleSelectAll} style={styles.bulkActionButton}>
                {savedProfiles.every(p => p.selected) ? 'Deselect All' : 'Select All'}
              </button>
              <button onClick={handleBulkEmail} style={styles.bulkActionButtonPrimary}>
                <Mail size={16} />
                Send Bulk Email
              </button>
              <button onClick={handleDeselectAll} style={styles.bulkActionButton}>
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Profiles Grid */}
        {savedProfiles.length > 0 ? (
          <div style={styles.profilesGrid}>
            {savedProfiles.map(profile => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onSelect={() => handleProfileSelect(profile.id)}
                onViewDetails={() => handleViewProfile(profile)}
                onToggleSave={handleToggleSave}
                isSaved={true}
              />
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <Star size={64} color="#d1d5db" />
            <h3 style={styles.emptyTitle}>No Saved Profiles Yet</h3>
            <p style={styles.emptyText}>
              Start saving profiles by clicking the star icon on any developer profile in the Search page
            </p>
          </div>
        )}
      </div>

      {/* Profile Detail Modal */}
      <ProfileDetailModal
        profile={selectedProfile}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedProfile(null);
        }}
      />

      {/* Email Modal */}
      {showEmailModal && (
        <EmailModal
          profiles={savedProfiles.filter(p => p.selected)}
          onClose={() => setShowEmailModal(false)}
          onSuccess={() => {
            setShowEmailModal(false);
            handleDeselectAll();
          }}
        />
      )}
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
  },

  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
  },

  headerActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    padding: '1.5rem',
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },

  statsBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },

  statsText: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  actionsRight: {
    display: 'flex',
    gap: '0.75rem',
  },

  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: '#fff',
    color: '#1a1a1a',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },

  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: '#fff',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },

  bulkActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#fffbf5',
    border: '2px solid #FF6B35',
    borderRadius: '12px',
    marginBottom: '1.5rem',
  },

  bulkActionsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  bulkActionsText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  bulkActionsRight: {
    display: 'flex',
    gap: '8px',
  },

  bulkActionButton: {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    color: '#374151',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },

  bulkActionButtonPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#FF6B35',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },

  profilesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6rem 2rem',
    textAlign: 'center',
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },

  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: '1.5rem',
    marginBottom: '0.5rem',
  },

  emptyText: {
    fontSize: '1rem',
    color: '#6b7280',
    maxWidth: '500px',
    lineHeight: '1.6',
  },
};

// Hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  button[style*="exportBtn"]:hover {
    border-color: #FF6B35 !important;
    color: #FF6B35 !important;
  }

  button[style*="clearBtn"]:hover {
    background: #fee2e2 !important;
  }
`;
document.head.appendChild(styleSheet);

export default SavedProfilesPage;
