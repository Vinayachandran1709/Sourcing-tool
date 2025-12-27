import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Search, Filter, Mail, Download, AlertCircle, CheckSquare, Square, List } from 'lucide-react';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import ProfileCard from '../../components/ProfileCard';
import ProfileDetailModal from '../../components/ProfileDetailModal';
import EmailModal from '../../components/EmailModal';
import FilterPanel from '../../components/FilterPanel';
import { 
  searchDevelopers, 
  toggleProfileSelection, 
  getSelectedProfiles,
  getSavedLists,
  addProfileToList 
} from '../../services/api';

const SearchDashboard = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [savedLists, setSavedLists] = useState([]);
  const [stats, setStats] = useState(null);
  const [currentFilters, setCurrentFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const PROFILES_PER_PAGE = 20;

  const handleSearch = async (filters) => {
  setLoading(true);
  setError(null);
  setCurrentFilters(filters);
  setCurrentPage(1); // Reset to first page
  
  try {
    // Save search to localStorage
    localStorage.setItem('lastSearch', JSON.stringify(filters));
    
    const data = await searchDevelopers(filters);
    setProfiles(data.profiles || []);
    setStats({ 
      total: data.total_found, 
      fromCache: data.from_cache, 
      fromGithub: data.from_github 
    });
  } catch (error) {
    console.error('Search failed:', error);
    
    if (error.response?.data?.error === 'LIMIT_EXCEEDED') {
      setError({
        type: 'LIMIT_EXCEEDED',
        message: error.response.data.message,
        showUpgrade: true
      });
    } else if (error.response?.status === 429) {
      setError({
        type: 'RATE_LIMIT',
        message: 'Too many requests. Please wait a moment and try again.',
        showUpgrade: false
      });
    } else {
      setError({
        type: 'GENERAL',
        message: error.response?.data?.message || 'Failed to search developers. Please try again.',
        showUpgrade: false
      });
    }
  } finally {
    setLoading(false);
  }
};

// Load saved lists on mount
useEffect(() => {

  const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);


  const loadLists = async () => {
    try {
      const data = await getSavedLists();
      setSavedLists(data.lists || []);
    } catch (error) {
      console.error('Failed to load saved lists:', error);
    }
  };
  loadLists();
  
  // Load last search from localStorage
  const lastSearch = localStorage.getItem('lastSearch');
  if (lastSearch) {
    try {
      const filters = JSON.parse(lastSearch);
      handleSearch(filters);
    } catch (error) {
      console.error('Failed to load last search:', error);
    }
  }
}, []);

// Profile selection handlers
const handleProfileSelect = async (profileId) => {
  try {
    await toggleProfileSelection(profileId);
    setProfiles(profiles.map(p => 
      p.id === profileId ? { ...p, selected: !p.selected } : p
    ));
  } catch (error) {
    console.error('Failed to toggle selection:', error);
  }
};

const handleSelectAll = () => {
  const allSelected = profiles.every(p => p.selected);
  setProfiles(profiles.map(p => ({ ...p, selected: !allSelected })));
};

const handleDeselectAll = () => {
  setProfiles(profiles.map(p => ({ ...p, selected: false })));
};

// Profile detail modal
const handleViewProfile = (profile) => {
  setSelectedProfile(profile);
  setShowDetailModal(true);
};

// Add to list modal
const handleAddToList = (profile) => {
  setSelectedProfile(profile);
  setShowAddToListModal(true);
};

const handleAddToListConfirm = async (listId) => {
  try {
    await addProfileToList(listId, selectedProfile.id);
    alert('Profile added to list successfully!');
    setShowAddToListModal(false);
  } catch (error) {
    console.error('Failed to add to list:', error);
    alert('Failed to add profile to list. Please try again.');
  }
};

// Bulk email
const handleBulkEmail = () => {
  const selectedProfiles = profiles.filter(p => p.selected);
  if (selectedProfiles.length === 0) {
    alert('Please select at least one profile to send emails.');
    return;
  }
  setShowEmailModal(true);
};

// Export to CSV
const handleExportCSV = () => {
  const csv = [
    ['Name', 'Username', 'Score', 'Location', 'Email', 'Stars', 'Repos', 'Contributions', 'Primary Language'],
    ...profiles.map(p => [
      p.name || p.github_username,
      p.github_username,
      p.developer_score,
      p.location || '',
      p.email || '',
      p.total_stars,
      p.public_repos,
      p.total_contributions,
      p.primary_language || ''
    ])
  ].map(row => row.join(',')).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `developers_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

// Pagination
const paginatedProfiles = profiles.slice(
  (currentPage - 1) * PROFILES_PER_PAGE,
  currentPage * PROFILES_PER_PAGE
);

const totalPages = Math.ceil(profiles.length / PROFILES_PER_PAGE);

const handleRetry = () => {
  if (currentFilters && Object.keys(currentFilters).length > 0) {
    handleSearch(currentFilters);
  }
};

  const handleToggleSelect = async (profileId) => {
    try {
      await toggleProfileSelection(profileId);
      setProfiles(prev => 
        prev.map(p => p.id === profileId ? {...p, selected: !p.selected} : p)
      );
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  return (
  <>
    <DashboardHeader />
    <div style={styles.content}>
      {/* Advanced Filters */}
      <FilterPanel 
        onApplyFilters={handleSearch} 
        initialFilters={currentFilters}
      />

      {/* Error Display */}
      {error && (
        <div style={styles.errorBox}>
          <AlertCircle size={20} color="#dc2626" />
          <div style={styles.errorContent}>
            <span style={styles.errorMessage}>{error.message}</span>
            <div style={styles.errorActions}>
              <button onClick={handleRetry} style={styles.retryButton}>
                Try Again
              </button>
              {error.showUpgrade && (
                <button 
                  onClick={() => window.location.href = '/pricing'} 
                  style={styles.upgradeButton}
                >
                  Upgrade Plan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Searching developers...</p>
        </div>
      )}

      {/* Stats Bar */}
      {stats && !loading && (
        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{stats.total}</span>
            <span style={styles.statLabel}>Total Found</span>
          </div>
          <div style={styles.statDivider}></div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{stats.fromCache}</span>
            <span style={styles.statLabel}>From Cache</span>
          </div>
          <div style={styles.statDivider}></div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{stats.fromGithub}</span>
            <span style={styles.statLabel}>From GitHub</span>
          </div>
          <div style={styles.statDivider}></div>
          <div style={styles.statItem}>
            <button onClick={handleExportCSV} style={styles.exportButton}>
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {profiles.filter(p => p.selected).length > 0 && (
        <div style={styles.bulkActions}>
          <div style={styles.bulkActionsLeft}>
            <CheckSquare size={20} color="#FF6B35" />
            <span style={styles.bulkActionsText}>
              {profiles.filter(p => p.selected).length} profile(s) selected
            </span>
          </div>
          <div style={styles.bulkActionsRight}>
            <button onClick={handleSelectAll} style={styles.bulkActionButton}>
              {profiles.every(p => p.selected) ? 'Deselect All' : 'Select All'}
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
      {!loading && paginatedProfiles.length > 0 && (
        <>
          <div style={styles.profilesGrid}>
            {paginatedProfiles.map(profile => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onSelect={() => handleProfileSelect(profile.id)}
                onViewDetails={() => handleViewProfile(profile)}
                onAddToList={() => handleAddToList(profile)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
                }}
              >
                Previous
              </button>
              <div style={styles.paginationInfo}>
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && profiles.length === 0 && !error && (
        <div style={styles.emptyState}>
          <Search size={48} color="#9ca3af" />
          <h3 style={styles.emptyStateTitle}>No developers found</h3>
          <p style={styles.emptyStateText}>
            Try adjusting your filters or search criteria
          </p>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <EmailModal
          profiles={profiles.filter(p => p.selected)}
          onClose={() => setShowEmailModal(false)}
          onSuccess={() => {
            setShowEmailModal(false);
            handleDeselectAll();
          }}
        />
      )}

      {/* Profile Detail Modal */}
      {showDetailModal && selectedProfile && (
        <ProfileDetailModal
          profile={selectedProfile}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedProfile(null);
          }}
        />
      )}

      {/* Add to List Modal */}
      {showAddToListModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddToListModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Add to Saved List</h3>
            <div style={styles.listOptions}>
              {savedLists.length === 0 ? (
                <p style={styles.noLists}>No saved lists yet. Create one first!</p>
              ) : (
                savedLists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => handleAddToListConfirm(list.id)}
                    style={styles.listOption}
                  >
                    <List size={16} />
                    {list.name}
                  </button>
                ))
              )}
            </div>
            <button 
              onClick={() => setShowAddToListModal(false)} 
              style={styles.modalCloseButton}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  </>
);
};

const styles = {
  
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
  },

  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
  },

  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    marginBottom: '24px',
  },

  errorContent: {
    flex: 1,
  },

  errorMessage: {
    display: 'block',
    color: '#991b1b',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '8px',
  },

  errorActions: {
    display: 'flex',
    gap: '8px',
  },

  retryButton: {
    padding: '6px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #dc2626',
    borderRadius: '6px',
    color: '#dc2626',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
  },

  upgradeButton: {
    padding: '6px 12px',
    backgroundColor: '#FF6B35',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
  },

  // NEW: Loading states
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },

  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #FF6B35',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  loadingText: {
    marginTop: '16px',
    color: '#6b7280',
    fontSize: '14px',
  },

  // NEW: Stats bar
  statsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    marginBottom: '24px',
  },

  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },

  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1a1a1a',
  },

  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  statDivider: {
    width: '1px',
    height: '40px',
    backgroundColor: '#e5e7eb',
  },

  exportButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    transition: 'all 0.2s',
  },

  // NEW: Bulk actions bar
  bulkActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#fffbf5',
    border: '2px solid #FF6B35',
    borderRadius: '12px',
    marginBottom: '24px',
  },

  bulkActionsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  bulkActionsText: {
    fontSize: '14px',
    fontWeight: 600,
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
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    transition: 'all 0.2s',
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
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    transition: 'all 0.2s',
  },

  // Profiles grid
  profilesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },

  // NEW: Pagination
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    padding: '24px',
  },

  paginationButton: {
    padding: '10px 20px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    transition: 'all 0.2s',
  },

  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  paginationInfo: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: 500,
  },

  // Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    textAlign: 'center',
  },

  emptyStateTitle: {
    marginTop: '16px',
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a1a1a',
  },

  emptyStateText: {
    marginTop: '8px',
    fontSize: '14px',
    color: '#6b7280',
  },

  // NEW: Modal styles
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
    zIndex: 1000,
  },

  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
  },

  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '16px',
  },

  listOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },

  listOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    transition: 'all 0.2s',
    textAlign: 'left',
  },

  noLists: {
    padding: '20px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },

  modalCloseButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#f9fafb',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },

  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    transition: 'all 0.3s',
  },

  statIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statContent: {
    flex: 1,
  },

  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 1,
  },

  statLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.375rem',
  },

  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    gap: '1.5rem',
  },

  loadingText: {
    fontSize: '1.125rem',
    color: '#6b7280',
    fontWeight: '500',
  },

  resultsSection: {
    marginTop: '2rem',
  },

  resultsHeader: {
    marginBottom: '1.5rem',
  },

  resultsTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1a1a1a',
  },

  profilesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5rem 2rem',
    textAlign: 'center',
  },

  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: '1.5rem',
  },

  emptyText: {
    fontSize: '1rem',
    color: '#6b7280',
    marginTop: '0.5rem',
    maxWidth: '400px',
  },
};

export default SearchDashboard;