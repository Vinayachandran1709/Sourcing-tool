import React, { useState, useEffect, useCallback } from 'react';
import { Search, Mail, AlertCircle, CheckSquare } from 'lucide-react';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import ProfileCard from '../../components/ProfileCard';
import ProfileDetailModal from '../../components/ProfileDetailModal';
import EmailModal from '../../components/EmailModal';
import FilterPanel from '../../components/FilterPanel';
import { useAuth } from '../../contexts/AuthContext';

import {toggleProfileSelection} from '../../services/api';

const SearchDashboard = () => {
  const { incrementUsage } = useAuth();
  const [profiles, setProfiles] = useState(() => {
    const saved = sessionStorage.getItem('searchResults');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const [currentFilters, setCurrentFilters] = useState(() => {
    const saved = sessionStorage.getItem('currentFilters');
    return saved ? JSON.parse(saved) : {};
  });
  const [error, setError] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [savedProfileIds, setSavedProfileIds] = useState(() => {
    const saved = localStorage.getItem('savedProfileIds');
    return saved ? JSON.parse(saved) : [];
  });

  // Track unlocked profile IDs
  const [unlockedProfileIds, setUnlockedProfileIds] = useState(() => {
    const saved = localStorage.getItem('unlockedProfileIds');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchProgress, setSearchProgress] = useState({
    isSearching: false,
    message: '',
    totalFound: 0
  });

  const [showSearchMessage, setShowSearchMessage] = useState(true);
  const searchMessageTimerRef = React.useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [scoreFilterRanges, setScoreFilterRanges] = useState(() => {
    const saved = sessionStorage.getItem('scoreFilterRanges');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    sessionStorage.setItem('scoreFilterRanges', JSON.stringify(scoreFilterRanges));
  }, [scoreFilterRanges]);
  const PROFILES_PER_PAGE = 12;

  useEffect(() => {
    if (profiles.length > 0) {
      sessionStorage.setItem('searchResults', JSON.stringify(profiles));
    }
  }, [profiles]);

  useEffect(() => {
    if (Object.keys(currentFilters).length > 0) {
      sessionStorage.setItem('currentFilters', JSON.stringify(currentFilters));
    }
  }, [currentFilters]);

  // Persist unlocked IDs
  useEffect(() => {
    localStorage.setItem('unlockedProfileIds', JSON.stringify(unlockedProfileIds));
  }, [unlockedProfileIds]);

  const handleSearch = async (filters) => {
    setLoading(true);
    setError(null);
    setProfiles([]);
    setCurrentFilters(filters);
    setCurrentPage(1);
    setScoreFilterRanges([]);
    setShowSearchMessage(true);

    // Clear any existing timer
    if (searchMessageTimerRef.current) {
      clearTimeout(searchMessageTimerRef.current);
    }

    // Hide the search message after 2 minutes (120000ms)
    searchMessageTimerRef.current = setTimeout(() => {
      setShowSearchMessage(false);
    }, 120000);

    setSearchProgress({
      isSearching: true,
      message: 'Searching for developers...',
      totalFound: 0
    });

    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

      const requestBody = {
        role: filters.role || null,
        languages: filters.languages || [],
        location: filters.location || null,
        min_repos: filters.min_repos || 0
      };

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
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

        for (const message of messages) {
          if (!message.trim() || !message.startsWith('data: ')) continue;

          try {
            const jsonStr = message.replace(/^data: /, '');
            const data = JSON.parse(jsonStr);

            switch (data.type) {
              case 'status':
                setSearchProgress(prev => ({ ...prev, message: data.message }));
                break;
              case 'profiles':
                setProfiles(data.profiles);
                setSearchProgress(prev => ({
                  ...prev,
                  totalFound: data.count,
                  message: 'Loading developer profiles...'
                }));
                break;
              case 'progress':
                setSearchProgress(prev => ({
                  ...prev,
                  totalFound: data.total_found,
                  message: 'Finding more developers...'
                }));
                break;
              case 'new_profiles':
                setProfiles(prev => [...prev, ...data.profiles]);
                break;
              case 'complete':
                // Clear the timer when search completes
                if (searchMessageTimerRef.current) {
                  clearTimeout(searchMessageTimerRef.current);
                }
                setSearchProgress({
                  isSearching: false,
                  message: 'Search complete!',
                  totalFound: data.total
                });
                setLoading(false);
                // Increment search usage count
                incrementUsage('search', 1);
                break;
              case 'error':
                // Clear the timer on error
                if (searchMessageTimerRef.current) {
                  clearTimeout(searchMessageTimerRef.current);
                }
                setError({ message: data.message });
                setLoading(false);
                setSearchProgress({ isSearching: false, message: '', totalFound: 0 });
                break;
              default:
                break;
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }

    } catch (error) {
      console.error('Search failed:', error);
      // Clear the timer on error
      if (searchMessageTimerRef.current) {
        clearTimeout(searchMessageTimerRef.current);
      }
      setError({ message: error.message || 'Failed to start search. Please try again.' });
      setLoading(false);
      setSearchProgress({ isSearching: false, message: '', totalFound: 0 });
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchMessageTimerRef.current) {
        clearTimeout(searchMessageTimerRef.current);
      }
    };
  }, []);

  const handleProfileSelect = useCallback(async (profileId) => {
    setProfiles(prevProfiles =>
      prevProfiles.map(p =>
        p.id === profileId ? { ...p, selected: !p.selected } : p
      )
    );
    try {
      await toggleProfileSelection(profileId);
    } catch (error) {
      console.error('Failed to toggle selection:', error);
      setProfiles(prevProfiles =>
        prevProfiles.map(p =>
          p.id === profileId ? { ...p, selected: !p.selected } : p
        )
      );
    }
  }, []);

  const handleSelectAll = () => {
    const allSelected = filteredProfiles.every(p => p.selected);
    // Select/deselect ALL filtered profiles (not just current page)
    const filteredIds = new Set(filteredProfiles.map(p => p.id));
    setProfiles(profiles.map(p =>
      filteredIds.has(p.id) ? { ...p, selected: !allSelected } : p
    ));
  };

  const handleDeselectAll = () => {
    setProfiles(profiles.map(p => ({ ...p, selected: false })));
  };

  // Check unlock limits in background and revert if over limit
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

  // Handle unlock profile - check limits, mark as unlocked, open modal
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

  const handleToggleSave = (profile) => {
    const isSaved = savedProfileIds.includes(profile.id);
    let updatedSavedIds;

    if (isSaved) {
      updatedSavedIds = savedProfileIds.filter(id => id !== profile.id);
    } else {
      // Check saved profiles limit for free trial users
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const isFree = !user.plan || user.plan === 'free_trial' || user.plan === 'free';
      if (isFree && savedProfileIds.length >= 50) {
        alert('You\'ve reached the 50 saved profiles limit on the Free Trial plan. Upgrade to Starter for unlimited saves.');
        return;
      }

      updatedSavedIds = [...savedProfileIds, profile.id];
      const savedProfiles = JSON.parse(localStorage.getItem('savedProfiles') || '[]');
      const profileExists = savedProfiles.some(p => p.id === profile.id);
      if (!profileExists) {
        savedProfiles.push(profile);
        localStorage.setItem('savedProfiles', JSON.stringify(savedProfiles));
      }
    }

    setSavedProfileIds(updatedSavedIds);
    localStorage.setItem('savedProfileIds', JSON.stringify(updatedSavedIds));

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

    try {
      const { getEmailUsage } = await import('../../services/api');
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
    }

    setShowEmailModal(true);
  };

  const handleScoreRangeToggle = (range) => {
    const isSelected = scoreFilterRanges.some(r => r.min === range.min && r.max === range.max);
    if (isSelected) {
      setScoreFilterRanges(scoreFilterRanges.filter(r => !(r.min === range.min && r.max === range.max)));
    } else {
      setScoreFilterRanges([...scoreFilterRanges, range]);
    }
    setCurrentPage(1);
  };

  // Select all filtered profiles (for score filter quick action)
  const handleSelectAllFiltered = () => {
    const filteredIds = new Set(filteredProfiles.map(p => p.id));
    const allFilteredSelected = filteredProfiles.every(p => p.selected);
    setProfiles(profiles.map(p =>
      filteredIds.has(p.id) ? { ...p, selected: !allFilteredSelected } : p
    ));
  };

  // Score filtering
  const filteredProfiles = profiles.filter(profile => {
    if (scoreFilterRanges.length === 0) return true;
    const score = profile.developer_score || 0;
    return scoreFilterRanges.some(range => score >= range.min && score <= range.max);
  });

  const selectedFilteredCount = filteredProfiles.filter(p => p.selected).length;

  const totalPages = Math.ceil(filteredProfiles.length / PROFILES_PER_PAGE);
  const paginatedProfiles = filteredProfiles.slice(
    (currentPage - 1) * PROFILES_PER_PAGE,
    currentPage * PROFILES_PER_PAGE
  );

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
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
        <FilterPanel
          onApplyFilters={handleSearch}
          initialFilters={currentFilters}
          onReset={() => {
            setProfiles([]);
            setSearchProgress({ isSearching: false, message: '', totalFound: 0 });
            setCurrentFilters({});
            sessionStorage.removeItem('searchResults');
            sessionStorage.removeItem('currentFilters');
            sessionStorage.removeItem('scoreFilterRanges');
          }}
        />

        {/* Search Progress - Only show for first 2 minutes */}
        {searchProgress.isSearching && showSearchMessage && (
          <div style={styles.progressContainer}>
            <div style={styles.progressHeader}>
              <span style={styles.progressStatus}>{searchProgress.message}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={20} color="#dc2626" />
            <span>{error.message}</span>
          </div>
        )}

        {/* Score filter with Select All + Send Email actions */}
        {profiles.length > 0 && !loading && (
          <>
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
                  { label: '0-30 (Beginner)', min: 0, max: 30, color: '' },
                  { label: '30-50 (Junior)', min: 30, max: 50, color: '#6b7280' },
                  { label: '50-70 (Mid-Level)', min: 50, max: 70, color: '#f59e0b' },
                  { label: '70-85 (Senior)', min: 70, max: 85, color: '#3b82f6' },
                  { label: '85-100 (Expert)', min: 85, max: 100, color: '#10b981' }
                ].map(range => {
                  const isSelected = scoreFilterRanges.some(r => r.min === range.min && r.max === range.max);
                  return (
                    <label
                      key={range.label}
                      style={{
                        ...styles.scoreRangeLabel,
                        ...(isSelected ? styles.scoreRangeLabelSelected : {}),
                        borderColor: isSelected ? range.color : '#e5e7eb'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleScoreRangeToggle(range)}
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

              {/* Score filter actions bar: count + Select All + Send Email + Clear */}
              {scoreFilterRanges.length > 0 && (
                <div style={styles.scoreFilterActions}>
                  <span style={styles.scoreFilterCount}>
                    {filteredProfiles.length} profiles
                    {selectedFilteredCount > 0 && ` (${selectedFilteredCount} selected)`}
                  </span>
                  <div style={styles.scoreFilterButtons}>
                    <button
                      onClick={handleSelectAllFiltered}
                      style={styles.scoreSelectAllBtn}
                    >
                      <CheckSquare size={14} />
                      {filteredProfiles.every(p => p.selected) ? 'Deselect All' : `Select All (${filteredProfiles.length})`}
                    </button>
                    {selectedFilteredCount > 0 && (
                      <button
                        onClick={handleBulkEmail}
                        style={styles.scoreSendEmailBtn}
                      >
                        <Mail size={14} />
                        Send Email ({selectedFilteredCount})
                      </button>
                    )}
                    <button
                      onClick={() => setScoreFilterRanges([])}
                      style={styles.clearScoreFilter}
                    >
                      Clear Filter
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bulk Actions - Always visible when profiles exist */}
            <div style={styles.bulkActions}>
              <div style={styles.bulkActionsLeft}>
                <CheckSquare size={20} color={profiles.filter(p => p.selected).length > 0 ? "#FF6B35" : "#9ca3af"} />
                <span style={styles.bulkActionsText}>
                  {profiles.filter(p => p.selected).length > 0
                    ? `${profiles.filter(p => p.selected).length} profile(s) selected`
                    : 'No profiles selected'}
                </span>
              </div>
              <div style={styles.bulkActionsRight}>
                <button onClick={handleSelectAll} style={styles.bulkActionButton}>
                  {filteredProfiles.every(p => p.selected) ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleBulkEmail}
                  style={{
                    ...styles.bulkActionButtonPrimary,
                    ...(profiles.filter(p => p.selected).length === 0 ? styles.bulkActionButtonDisabled : {})
                  }}
                  disabled={profiles.filter(p => p.selected).length === 0}
                >
                  <Mail size={16} />
                  Send Email
                </button>
                <button
                  onClick={handleDeselectAll}
                  style={{
                    ...styles.bulkActionButton,
                    ...(profiles.filter(p => p.selected).length === 0 ? styles.bulkActionButtonDisabled : {})
                  }}
                  disabled={profiles.filter(p => p.selected).length === 0}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </>
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
                  isUnlocked={unlockedProfileIds.includes(profile.id)}
                />
              ))}
            </div>

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

        <ProfileDetailModal
          profile={selectedProfile}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedProfile(null);
          }}
        />
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
  },

  progressStatus: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a1a',
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

  bulkActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
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

  bulkActionButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
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

  // Score filter actions bar
  scoreFilterActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    flexWrap: 'wrap',
    gap: '12px',
  },

  scoreFilterCount: {
    fontSize: '14px',
    color: '#15803d',
    fontWeight: '600',
  },

  scoreFilterButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },

  scoreSelectAllBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    color: '#3b82f6',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    transition: 'all 0.2s',
  },

  scoreSendEmailBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    backgroundColor: '#FF6B35',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    transition: 'all 0.2s',
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
};

export default SearchDashboard;
