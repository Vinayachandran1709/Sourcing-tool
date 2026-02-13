import React, { useState, useEffect } from 'react';
import { Star, Trash2, Mail, CheckSquare } from 'lucide-react';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import ProfileCard from '../../components/ProfileCard';
import ProfileDetailModal from '../../components/ProfileDetailModal';
import EmailModal from '../../components/EmailModal';
import { useAuth } from '../../contexts/AuthContext';


const SAVED_PROFILES_LIMIT_FREE = 50;

const SavedProfilesPage = () => {
  const { incrementUsage } = useAuth();
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [savedProfileIds, setSavedProfileIds] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Track unlocked profile IDs (shared with SearchDashboard via localStorage)
  const [unlockedProfileIds, setUnlockedProfileIds] = useState(() => {
    const saved = localStorage.getItem('unlockedProfileIds');
    return saved ? JSON.parse(saved) : [];
  });

  // Load saved profiles from localStorage - REVERSED so latest saved appears first
  useEffect(() => {
    const loadSavedProfiles = () => {
      const profiles = JSON.parse(localStorage.getItem('savedProfiles') || '[]');
      const ids = JSON.parse(localStorage.getItem('savedProfileIds') || '[]');
      // Reverse so latest saved profile appears first, initialize with selected: false
      setSavedProfiles(profiles.slice().reverse().map(p => ({ ...p, selected: false })));
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

    // Also update localStorage (keep original order there, just remove the item)
    const storedProfiles = JSON.parse(localStorage.getItem('savedProfiles') || '[]');
    const filteredStored = storedProfiles.filter(p => p.id !== profile.id);
    localStorage.setItem('savedProfiles', JSON.stringify(filteredStored));
    localStorage.setItem('savedProfileIds', JSON.stringify(updatedIds));
  };

  // Persist unlocked IDs to localStorage
  useEffect(() => {
    localStorage.setItem('unlockedProfileIds', JSON.stringify(unlockedProfileIds));
  }, [unlockedProfileIds]);

  const checkUnlockLimit = (profileId) => {
    const token = localStorage.getItem('token');
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    fetch(`${API_URL}/api/usage-stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => (res.ok ? res.json() : null))
      .then(usage => {
        if (!usage?.profile_unlocks) return;
        if (usage.profile_unlocks.used < usage.profile_unlocks.limit) return;
        setUnlockedProfileIds(prev => prev.filter(id => id !== profileId));
        setShowDetailModal(false);
        setSelectedProfile(null);
        alert(`Profile unlock limit reached! You've used ${usage.profile_unlocks.used}/${usage.profile_unlocks.limit} unlocks. Upgrade to unlock more profiles.`);
      })
      .catch(() => {});
  };

  const handleViewProfile = (profile) => {
    const isNewUnlock = !unlockedProfileIds.includes(profile.id);
    if (isNewUnlock) {
      setUnlockedProfileIds(prev => [...prev, profile.id]);
      checkUnlockLimit(profile.id);
      // Increment profile unlock usage count
      incrementUsage('profile_unlock', 1);
    }
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

  const selectedCount = savedProfiles.filter(p => p.selected).length;

  return (
    <div style={styles.page}>
      <DashboardHeader
        title="Saved Profiles"
        subtitle="View and manage your saved developer profiles"
      />

      <div style={styles.container}>
        {/* Header Actions */}
        {savedProfiles.length > 0 && (() => {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const isFree = !user.plan || user.plan === 'free_trial' || user.plan === 'free';
          return (
            <div style={styles.headerActions}>
              <div style={styles.statsBox}>
                <Star size={20} color="#FFB800" fill="#FFB800" />
                <span style={styles.statsText}>
                  {savedProfiles.length}{isFree ? ` / ${SAVED_PROFILES_LIMIT_FREE}` : ''} profile{savedProfiles.length !== 1 ? 's' : ''} saved
                  {isFree && savedProfiles.length >= SAVED_PROFILES_LIMIT_FREE && (
                    <span style={{ color: '#ef4444', marginLeft: '8px', fontSize: '0.8125rem' }}>
                      (Limit reached - <a href="/dashboard/subscription" style={{ color: '#FF6B35', textDecoration: 'underline' }}>Upgrade</a>)
                    </span>
                  )}
                </span>
              </div>
              <div style={styles.actionsRight}>
                <button onClick={handleClearAll} style={styles.clearBtn}>
                  <Trash2 size={18} />
                  <span>Clear All</span>
                </button>
              </div>
            </div>
          );
        })()}

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
                isUnlocked={unlockedProfileIds.includes(profile.id)}
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

// Hover effects (guarded to prevent duplicate injection)
if (!document.getElementById('saved-profiles-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'saved-profiles-styles';
  styleSheet.textContent = `
    button[style*="clearBtn"]:hover {
      background: #fee2e2 !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default SavedProfilesPage;
