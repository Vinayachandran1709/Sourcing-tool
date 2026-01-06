import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Mail, Download, AlertCircle, CheckSquare, List } from 'lucide-react';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import ProfileCard from '../../components/ProfileCard';
import ProfileDetailModal from '../../components/ProfileDetailModal';
import EmailModal from '../../components/EmailModal';
import FilterPanel from '../../components/FilterPanel';
import { 
  toggleProfileSelection, 
  getSavedLists,
  addProfileToList 
} from '../../services/api';

const SearchDashboard = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [savedProfileIds, setSavedProfileIds] = useState(() => {
    // Load saved profile IDs from localStorage
    const saved = localStorage.getItem('savedProfileIds');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentFilters, setCurrentFilters] = useState({});

  // ✅ NEW: Streaming state
  const [searchPhase, setSearchPhase] = useState(0); // 0=idle, 1-4=phases
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [stats, setStats] = useState({ fromCache: 0, fromGithub: 0, total: 0 });
  
  const [currentPage, setCurrentPage] = useState(1);
  const PROFILES_PER_PAGE = 12;

  // ✅ STREAMING SEARCH with Fetch (supports Authorization headers)
  const handleSearch = async (filters) => {
    setLoading(true);
    setError(null);
    setProfiles([]);
    setCurrentFilters(filters);
    setCurrentPage(1);
    setSearchPhase(1);
    setProgressPercent(0);
    setStatusMessage('🔍 Initializing search...');
    
    try {
      const token = localStorage.getItem('token');
      
      // Build request body
      const requestBody = {
        role: filters.role || null,
        languages: filters.languages || [],
        location: filters.location || null,
        min_repos: filters.min_repos || 0
      };
      
      // Use fetch with streaming
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/search-profiles-stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let cachedCount = 0;
      let newCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Decode chunk
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete messages (ending with \n\n)
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || ''; // Keep incomplete message in buffer
        
        for (const message of messages) {
          if (!message.trim() || !message.startsWith('data: ')) continue;
          
          try {
            const jsonStr = message.replace(/^data: /, '');
            const data = JSON.parse(jsonStr);
            
            switch (data.type) {
              case 'status':
                setSearchPhase(data.phase);
                setStatusMessage(data.message);
                break;
                
              case 'cached_profiles':
                // ✅ PHASE 2: Show cached profiles immediately
                setProfiles(data.profiles);
                cachedCount = data.count;
                setStats({ fromCache: cachedCount, fromGithub: 0, total: cachedCount });
                setSearchPhase(2);
                setStatusMessage(`✅ Found ${cachedCount} profiles in database`);
                break;
                
              case 'progress':
                // ✅ PHASE 3: Update progress
                setProgressPercent(data.percent);
                newCount = data.profiles_found - cachedCount;
                setStats({ fromCache: cachedCount, fromGithub: newCount, total: data.profiles_found });
                setSearchPhase(3);
                setStatusMessage(`🌐 Fetching new profiles: ${data.processed}/${data.total}`);
                break;
                
              case 'new_profiles':
                // ✅ PHASE 3: Add new profiles as they arrive
                setProfiles(prev => [...prev, ...data.profiles]);
                break;
                
              case 'complete':
                // ✅ PHASE 4: Complete
                setStats({ 
                  fromCache: data.from_cache, 
                  fromGithub: data.from_github, 
                  total: data.total 
                });
                setSearchPhase(4);
                setStatusMessage(`✅ Search complete! Found ${data.total} developers`);
                setLoading(false);
                break;
                
              case 'error':
                setError({ message: data.message });
                setLoading(false);
                break;
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
      
    } catch (error) {
      console.error('Search failed:', error);
      setError({ message: error.message || 'Failed to start search. Please try again.' });
      setLoading(false);
    }
  };

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

  const handleViewProfile = (profile) => {
    setSelectedProfile(profile);
    setShowDetailModal(true);
  };

  const handleToggleSave = (profile) => {
    const isSaved = savedProfileIds.includes(profile.id);
    let updatedSavedIds;

    if (isSaved) {
      // Remove from saved
      updatedSavedIds = savedProfileIds.filter(id => id !== profile.id);
    } else {
      // Add to saved
      updatedSavedIds = [...savedProfileIds, profile.id];
      // Also save full profile data to localStorage
      const savedProfiles = JSON.parse(localStorage.getItem('savedProfiles') || '[]');
      const profileExists = savedProfiles.some(p => p.id === profile.id);
      if (!profileExists) {
        savedProfiles.push(profile);
        localStorage.setItem('savedProfiles', JSON.stringify(savedProfiles));
      }
    }

    setSavedProfileIds(updatedSavedIds);
    localStorage.setItem('savedProfileIds', JSON.stringify(updatedSavedIds));

    // Remove from saved profiles if unsaving
    if (isSaved) {
      const savedProfiles = JSON.parse(localStorage.getItem('savedProfiles') || '[]');
      const filtered = savedProfiles.filter(p => p.id !== profile.id);
      localStorage.setItem('savedProfiles', JSON.stringify(filtered));
    }
  };

  const handleBulkEmail = () => {
    const selectedProfiles = profiles.filter(p => p.selected);
    if (selectedProfiles.length === 0) {
      alert('Please select at least one profile to send emails.');
      return;
    }
    setShowEmailModal(true);
  };

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
        p.contributions_last_year,
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

  // ✅ NEW: Page number pagination
  const totalPages = Math.ceil(profiles.length / PROFILES_PER_PAGE);
  const paginatedProfiles = profiles.slice(
    (currentPage - 1) * PROFILES_PER_PAGE,
    currentPage * PROFILES_PER_PAGE
  );

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Smart pagination
      if (currentPage <= 4) {
        // Near start: [1] [2] [3] [4] [5] ... [15]
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near end: [1] ... [11] [12] [13] [14] [15]
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        // Middle: [1] ... [5] [6] [7] ... [15]
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <>
      <DashboardHeader />
      <div style={styles.content}>
        {/* Filters */}
        <FilterPanel 
          onApplyFilters={handleSearch} 
          initialFilters={currentFilters}
          onReset={() => {
            setProfiles([]);
            setStats({ fromCache: 0, fromGithub: 0, total: 0 });
            setCurrentFilters({});
            setSearchPhase(0);
          }}
        />
        
        {/* ✅ NEW: Progress Indicator */}
        {loading && searchPhase > 0 && (
          <div style={styles.progressContainer}>
            <div style={styles.progressHeader}>
              <span style={styles.progressPhase}>Phase {searchPhase}/4</span>
              <span style={styles.progressStatus}>{statusMessage}</span>
            </div>
            
            {searchPhase === 3 && (
              <div style={styles.progressBarContainer}>
                <div style={{...styles.progressBar, width: `${progressPercent}%`}}></div>
              </div>
            )}
            
            {searchPhase >= 2 && (
              <div style={styles.progressStats}>
                <div style={styles.progressStat}>
                  <span style={styles.progressStatValue}>{stats.fromCache}</span>
                  <span style={styles.progressStatLabel}>from cache</span>
                </div>
                <div style={styles.progressStat}>
                  <span style={styles.progressStatValue}>{stats.fromGithub}</span>
                  <span style={styles.progressStatLabel}>from GitHub</span>
                </div>
                <div style={styles.progressStat}>
                  <span style={styles.progressStatValue}>{stats.total}</span>
                  <span style={styles.progressStatLabel}>total</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={20} color="#dc2626" />
            <span>{error.message}</span>
          </div>
        )}

        {/* Stats Bar */}
        {profiles.length > 0 && !loading && (
          <div style={styles.statsBar}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{profiles.length}</span>
              <span style={styles.statLabel}>Profiles Found</span>
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

        {/* Bulk Actions */}
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
        {paginatedProfiles.length > 0 && (
          <>
            <div style={styles.profilesGrid}>
              {paginatedProfiles.map(profile => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onSelect={() => handleProfileSelect(profile.id)}
                  onViewDetails={() => handleViewProfile(profile)}
                  onToggleSave={handleToggleSave}
                  isSaved={savedProfileIds.includes(profile.id)}
                />
              ))}
            </div>

            {/* ✅ NEW: Page Number Pagination */}
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
                  ← Previous
                </button>
                
                <div style={styles.pageNumbers}>
                  {getPageNumbers().map((page, idx) => {
                    if (page === '...') {
                      return <span key={`ellipsis-${idx}`} style={styles.pageEllipsis}>...</span>;
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          ...styles.pageNumber,
                          ...(currentPage === page ? styles.pageNumberActive : {})
                        }}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    ...styles.paginationButton,
                    ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && profiles.length === 0 && !error && searchPhase === 0 && (
          <div style={styles.emptyState}>
            <Search size={48} color="#9ca3af" />
            <h3 style={styles.emptyStateTitle}>Start Your Search</h3>
            <p style={styles.emptyStateText}>
              Use the filters above to find developers
            </p>
          </div>
        )}

        {/* Modals */}
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
      </div>
    </>
  );
};

const styles = {
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
  },

  // ✅ NEW: Progress styles
  progressContainer: {
    padding: '24px',
    backgroundColor: '#f0fdf4',
    border: '2px solid #10b981',
    borderRadius: '12px',
    marginBottom: '24px',
  },

  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },

  progressPhase: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  progressStatus: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  progressBarContainer: {
    height: '12px',
    backgroundColor: '#d1fae5',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '16px',
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    transition: 'width 0.3s ease',
    borderRadius: '6px',
  },

  progressStats: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'center',
  },

  progressStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },

  progressStatValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#10b981',
  },

  progressStatLabel: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    marginBottom: '24px',
    color: '#991b1b',
  },

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
    fontWeight: '700',
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
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
  },

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
    fontFamily: 'Outfit, sans-serif',
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
    fontFamily: 'Outfit, sans-serif',
  },

  profilesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },

  // ✅ NEW: Page number pagination styles
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    padding: '24px',
  },

  paginationButton: {
    padding: '10px 20px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    color: '#374151',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
  },

  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  pageNumbers: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },

  pageNumber: {
    minWidth: '40px',
    height: '40px',
    padding: '0 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    color: '#374151',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    transition: 'all 0.2s',
  },

  pageNumberActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
    color: '#ffffff',
  },

  pageEllipsis: {
    padding: '0 8px',
    color: '#9ca3af',
    fontSize: '14px',
    fontWeight: '600',
  },

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
    fontWeight: '600',
    color: '#1a1a1a',
  },

  emptyStateText: {
    marginTop: '8px',
    fontSize: '14px',
    color: '#6b7280',
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
    zIndex: 1000,
  },

  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
  },

  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
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
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
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
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
};

export default SearchDashboard;