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
  // ✅ PERSIST: Load profiles and filters from localStorage on mount
  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem('searchResults');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const [currentFilters, setCurrentFilters] = useState(() => {
    const saved = localStorage.getItem('currentFilters');
    return saved ? JSON.parse(saved) : {};
  });
  const [error, setError] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [savedProfileIds, setSavedProfileIds] = useState(() => {
    // Load saved profile IDs from localStorage
    const saved = localStorage.getItem('savedProfileIds');
    return saved ? JSON.parse(saved) : [];
  });

  // ✅ OPTIMIZATION #1: Smooth progress (NO phases)
  const [searchProgress, setSearchProgress] = useState({
    isSearching: false,
    message: '',
    totalFound: 0
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [scoreFilterRanges, setScoreFilterRanges] = useState(() => {
    const saved = localStorage.getItem('scoreFilterRanges');
    return saved ? JSON.parse(saved) : [];
  });

  // ✅ OPTIMIZATION #2: Search completion state (controls score filter)
  const [searchComplete, setSearchComplete] = useState(false);

  useEffect(() => {
    localStorage.setItem('scoreFilterRanges', JSON.stringify(scoreFilterRanges));
  }, [scoreFilterRanges]);
  const PROFILES_PER_PAGE = 12;

  // ✅ PERSIST: Save profiles to localStorage whenever they change
  useEffect(() => {
    if (profiles.length > 0) {
      localStorage.setItem('searchResults', JSON.stringify(profiles));
    }
  }, [profiles]);

  // ✅ PERSIST: Save filters to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(currentFilters).length > 0) {
      localStorage.setItem('currentFilters', JSON.stringify(currentFilters));
    }
  }, [currentFilters]);

  // ✅ STREAMING SEARCH with Fetch (supports Authorization headers)
  const handleSearch = async (filters) => {
    setLoading(true);
    setError(null);
    setProfiles([]);
    setCurrentFilters(filters);
    setCurrentPage(1);
    setScoreFilterRanges([]); // Reset score filter ranges
    
    // ✅ OPTIMIZATION #2: Disable score filter during search
    setSearchComplete(false);
    
    // ✅ OPTIMIZATION #1: Smooth progress initialization
    setSearchProgress({
      isSearching: true,
      message: 'Searching for developers...',
      totalFound: 0
    });
    
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      
      // Build request body
      const requestBody = {
        role: filters.role || null,
        languages: filters.languages || [],
        location: filters.location || null,
        min_repos: filters.min_repos || 0
      };
      
      // Use fetch with streaming
      const response = await fetch(
        `${API_URL}/api/search-profiles-stream`,
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
                // ✅ OPTIMIZATION #1: Smooth status updates (no phase numbers)
                setSearchProgress(prev => ({
                  ...prev,
                  message: data.message
                }));
                break;
                
              case 'profiles':
                // Initial results loaded
                setProfiles(data.profiles);
                // ✅ OPTIMIZATION #1: Update smooth progress
                setSearchProgress(prev => ({
                  ...prev,
                  totalFound: data.count,
                  message: `Found ${data.count} developers...`
                }));
                break;
                
              case 'progress':
                // ✅ OPTIMIZATION #1: Update smooth progress (no phases)
                setSearchProgress(prev => ({
                  ...prev,
                  totalFound: data.total_found,
                  message: `Found ${data.total_found} developers...`
                }));
                break;
                
              case 'new_profiles':
                // Add new profiles as they arrive
                setProfiles(prev => [...prev, ...data.profiles]);
                break;
                
              case 'complete':
                // ✅ OPTIMIZATION #1: Smooth completion message
                setSearchProgress({
                  isSearching: false,
                  message: `Search complete! Found ${data.total} developers`,
                  totalFound: data.total
                });
                // ✅ OPTIMIZATION #2: Enable score filter when search completes
                setSearchComplete(true);
                setLoading(false);
                break;
                
              case 'error':
                setError({ message: data.message });
                setLoading(false);
                setSearchProgress({
                  isSearching: false,
                  message: '',
                  totalFound: 0
                });
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
      setSearchProgress({
        isSearching: false,
        message: '',
        totalFound: 0
      });
    }
  };

  // ✅ OPTIMIZATION #3: Optimistic select toggle (instant UI update)
  const handleProfileSelect = async (profileId) => {
    // ✅ Update UI immediately (optimistic)
    setProfiles(prevProfiles =>
      prevProfiles.map(p =>
        p.id === profileId ? { ...p, selected: !p.selected } : p
      )
    );

    // ✅ Then sync with backend in background
    try {
      await toggleProfileSelection(profileId);
    } catch (error) {
      console.error('Failed to toggle selection:', error);
      // ✅ Revert on error
      setProfiles(prevProfiles =>
        prevProfiles.map(p =>
          p.id === profileId ? { ...p, selected: !p.selected } : p
        )
      );
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

  const handleBulkEmail = async () => {
    const selectedProfiles = profiles.filter(p => p.selected);
    if (selectedProfiles.length === 0) {
      alert('Please select at least one profile to send emails.');
      return;
    }
    
    // Check email limits before opening modal
    try {
      const { getEmailUsage } = await import('../services/api');
      const usageData = await getEmailUsage();
      
      if (!usageData.usage.can_send) {
        alert(`Email limit reached! You've used ${usageData.usage.used}/${usageData.usage.limit} emails this month. Upgrade to send more.`);
        return;
      }
      
      if (selectedProfiles.length > usageData.usage.remaining) {
        alert(`Cannot send ${selectedProfiles.length} emails. Only ${usageData.usage.remaining} emails remaining this month.`);
        return;
      }
      
    } catch (error) {
      console.error('Failed to check email limits:', error);
      // Continue anyway - backend will enforce limits
    }
    
    setShowEmailModal(true);
  };

  const handleExportCSV = async () => {
  // Check CSV export limits
  try {
    const { checkCsvLimit, logCsvExport } = await import('../../services/api');
    const limits = await checkCsvLimit();
    
    if (!limits.can_export) {
      alert(`CSV export limit reached! You've used ${limits.used}/${limits.limit} exports. ${limits.limit === 10 ? 'This is a lifetime limit for free trial users.' : 'Upgrade to export more.'}`);
      return;
    }
  } catch (error) {
    console.error('Failed to check CSV limits:', error);
    alert('Failed to check export limits. Please try again.');
    return;
  }
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
    // Log the export
    try {
      const { logCsvExport } = await import('../../services/api');
      await logCsvExport();
    } catch (error) {
      console.error('Failed to log CSV export:', error);
    }
  };

  const handleScoreRangeToggle = (range) => {
    const isSelected = scoreFilterRanges.some(r => r.min === range.min && r.max === range.max);
    if (isSelected) {
      setScoreFilterRanges(scoreFilterRanges.filter(r => !(r.min === range.min && r.max === range.max)));
    } else {
      setScoreFilterRanges([...scoreFilterRanges, range]);
    }
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // ✅ SCORE FILTER: Apply score filtering
  const filteredProfiles = profiles.filter(profile => {
    if (scoreFilterRanges.length === 0) return true;
    
    const score = profile.developer_score || 0;
    return scoreFilterRanges.some(range => 
      score >= range.min && score <= range.max
    );
  });

  const totalPages = Math.ceil(filteredProfiles.length / PROFILES_PER_PAGE);
  const paginatedProfiles = filteredProfiles.slice(
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
            setSearchProgress({
              isSearching: false,
              message: '',
              totalFound: 0
            });
            setCurrentFilters({});
            setSearchComplete(false);
            localStorage.removeItem('searchResults');
            localStorage.removeItem('currentFilters');
            localStorage.removeItem('scoreFilterRanges');
          }}
        />
        
        {/* ✅ OPTIMIZATION #1: SMOOTH PROGRESS (no phase numbers, side stats) */}
        {searchProgress.isSearching && (
          <div style={styles.progressContainer}>
            <div style={styles.progressHeader}>
              <span style={styles.progressStatus}>{searchProgress.message}</span>
            </div>
            
            {searchProgress.totalFound > 0 && (
              <div style={styles.progressStats}>
                <div style={styles.progressStat}>
                  <span style={styles.progressStatValue}>{searchProgress.totalFound}</span>
                  <span style={styles.progressStatLabel}>developers found</span>
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

        {/* Export Button */}
        {profiles.length > 0 && !loading && (
          <div style={styles.exportBar}>
            <button onClick={handleExportCSV} style={styles.exportButton}>
              <Download size={16} />
              Export CSV
            </button>
          </div>
        )}


        {/* ✅ OPTIMIZATION #2: Score filter disabled during search */}
        {profiles.length > 0 && !loading && (
          <div style={styles.scoreFilterContainer}>
            <div style={styles.scoreFilterHeader}>
              <div style={styles.scoreFilterLeft}>
                <span style={styles.scoreFilterTitle}>Filter by Developer Score</span>
                {scoreFilterRanges.length > 0 && (
                  <span style={styles.scoreFilterBadge}>
                    {scoreFilterRanges.length} range{scoreFilterRanges.length !== 1 ? 's' : ''} selected
                  </span>
                )}
              </div>
            </div>

              <div style={styles.scoreRanges}>
                {[
                  { label: '0-30 (Beginner)', min: 0, max: 30, color: '#6b7280' },
                  { label: '30-50 (Junior)', min: 30, max: 50, color: '#f59e0b' },
                  { label: '50-70 (Mid-Level)', min: 50, max: 70, color: '#3b82f6' },
                  { label: '70-85 (Senior)', min: 70, max: 85, color: '#10b981' },
                  { label: '85-100 (Expert)', min: 85, max: 100, color: '#8b5cf6' }
                ].map(range => {
                  const isSelected = scoreFilterRanges.some(r => r.min === range.min && r.max === range.max);
                  return (
                    <label 
                      key={range.label}
                      style={{
                        ...styles.scoreRangeLabel,
                        ...(isSelected ? styles.scoreRangeLabelSelected : {}),
                        ...(searchComplete ? {} : styles.scoreRangeLabelDisabled),
                        borderColor: isSelected ? range.color : '#e5e7eb'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleScoreRangeToggle(range)}
                        disabled={false}
                        style={styles.scoreRangeCheckbox}
                      />
                      <div style={styles.scoreRangeContent}>
                        <span style={styles.scoreRangeText}>{range.label}</span>
                        <div 
                          style={{
                            ...styles.scoreRangeIndicator, 
                            backgroundColor: range.color
                          }}
                        ></div>
                      </div>
                    </label>
                  );
                })}
              </div>
            

            {scoreFilterRanges.length > 0 && (
              <div style={styles.scoreFilterInfo}>
                Showing {filteredProfiles.length} of {profiles.length} profiles
                <button 
                  onClick={() => setScoreFilterRanges([])}
                  style={styles.clearScoreFilter}
                >
                  Clear Score Filter
                </button>
              </div>
            )}
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
        {!loading && profiles.length === 0 && !error && !searchProgress.isSearching && (
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

  // ✅ OPTIMIZATION #1: Smooth progress styles (no phases)
  progressContainer: {
    padding: '24px',
    backgroundColor: '#f0fdf4',
    border: '2px solid #10b981',
    borderRadius: '12px',
    marginBottom: '24px',
  },

  progressHeader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
  },

  progressStatus: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a1a',
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

  scoreFilterContainer: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
  },

  scoreFilterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },

  scoreFilterLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  scoreFilterTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  scoreFilterBadge: {
    padding: '4px 12px',
    backgroundColor: '#FF6B35',
    color: '#ffffff',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },

  // ✅ OPTIMIZATION #2: Disabled hint
  scoreFilterDisabledHint: {
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },

  scoreFilterToggle: {
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

  scoreRanges: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },

  scoreRangeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  scoreRangeLabelSelected: {
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },

  // ✅ OPTIMIZATION #2: Disabled style
  scoreRangeLabelDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  scoreRangeCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    flexShrink: 0,
  },

  scoreRangeContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  scoreRangeText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  scoreRangeIndicator: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    flexShrink: 0,
  },

  scoreFilterInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#15803d',
    fontWeight: '600',
  },

  clearScoreFilter: {
    padding: '6px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #10b981',
    borderRadius: '6px',
    color: '#10b981',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
  },
  exportBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '16px 0',
    marginBottom: '24px',
  },
};

export default SearchDashboard;
