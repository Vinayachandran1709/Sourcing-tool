import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

function SearchDashboard() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentFilters, setCurrentFilters] = useState(null);
  
  // ✅ Simple stats - just total count
  const [stats, setStats] = useState({ total: 0 });
  
  // ✅ Smooth progress tracking (no phases)
  const [searchProgress, setSearchProgress] = useState({
    isSearching: false,
    message: '',
    percent: 0
  });
  
  // ✅ Search completion state - controls score filter
  const [searchComplete, setSearchComplete] = useState(false);
  
  // ✅ Score filter (disabled during search)
  const [scoreFilter, setScoreFilter] = useState(0);

  // Search form state
  const [searchFilters, setSearchFilters] = useState({
    role: '',
    languages: [],
    location: '',
    min_repos: 0
  });

  const handleSearch = async (filters) => {
    setError(null);
    setLoading(true);
    setProfiles([]);
    setFilteredProfiles([]);
    setStats({ total: 0 });
    setCurrentFilters(filters);
    setScoreFilter(0); // Reset score filter
    
    // ✅ Search started - disable score filter
    setSearchComplete(false);
    setSearchProgress({
      isSearching: true,
      message: 'Searching for developers...',
      percent: 0
    });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${api.API_URL}/api/search-profiles-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(filters)
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let allProfiles = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'status') {
                // ✅ Smooth status updates
                setSearchProgress(prev => ({
                  ...prev,
                  message: data.message
                }));
              }
              else if (data.type === 'profiles') {
                // Initial cached profiles
                const profilesWithSelection = data.profiles.map(p => ({
                  ...p,
                  selected: false
                }));
                allProfiles = [...allProfiles, ...profilesWithSelection];
                setProfiles(allProfiles);
                setFilteredProfiles(allProfiles);
                setStats({ total: allProfiles.length });
                
                // ✅ Update progress
                setSearchProgress(prev => ({
                  ...prev,
                  message: `Found ${allProfiles.length} developers...`
                }));
              }
              else if (data.type === 'new_profiles') {
                // New profiles streamed in
                const newProfiles = data.profiles.map(p => ({
                  ...p,
                  selected: false
                }));
                allProfiles = [...allProfiles, ...newProfiles];
                setProfiles(allProfiles);
                setFilteredProfiles(allProfiles);
                setStats({ total: allProfiles.length });
                
                // ✅ Update progress message
                setSearchProgress(prev => ({
                  ...prev,
                  message: `Found ${allProfiles.length} developers...`
                }));
              }
              else if (data.type === 'progress') {
                // ✅ Smooth progress updates
                setSearchProgress(prev => ({
                  ...prev,
                  percent: data.percent,
                  message: `Found ${data.total_found} developers...`
                }));
              }
              else if (data.type === 'complete') {
                // ✅ Search complete - enable score filter
                setSearchProgress({
                  isSearching: false,
                  message: `Search complete! Found ${data.total} developers`,
                  percent: 100
                });
                setSearchComplete(true);
                setLoading(false);
              }
              else if (data.type === 'error') {
                setError(data.message);
                setLoading(false);
                setSearchProgress({
                  isSearching: false,
                  message: '',
                  percent: 0
                });
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Search failed');
      setLoading(false);
      setSearchProgress({
        isSearching: false,
        message: '',
        percent: 0
      });
    }
  };

  // ✅ OPTIMIZATION: Optimistic select toggle (instant UI update)
  const handleSelectToggle = async (profileId) => {
    // ✅ Update UI immediately (optimistic)
    setProfiles(prevProfiles =>
      prevProfiles.map(p =>
        p.id === profileId ? { ...p, selected: !p.selected } : p
      )
    );
    setFilteredProfiles(prevProfiles =>
      prevProfiles.map(p =>
        p.id === profileId ? { ...p, selected: !p.selected } : p
      )
    );

    // ✅ Then sync with backend (fire and forget)
    try {
      await api.toggleProfileSelection(profileId);
    } catch (err) {
      console.error('Failed to sync selection:', err);
      // ✅ Revert on error
      setProfiles(prevProfiles =>
        prevProfiles.map(p =>
          p.id === profileId ? { ...p, selected: !p.selected } : p
        )
      );
      setFilteredProfiles(prevProfiles =>
        prevProfiles.map(p =>
          p.id === profileId ? { ...p, selected: !p.selected } : p
        )
      );
    }
  };

  // ✅ Score filter handler (disabled during search)
  const handleScoreFilterChange = (e) => {
    const newScore = parseInt(e.target.value);
    setScoreFilter(newScore);
    
    if (newScore === 0) {
      setFilteredProfiles(profiles);
    } else {
      const filtered = profiles.filter(p => p.developer_score >= newScore);
      setFilteredProfiles(filtered);
    }
  };

  const handleResetSearch = () => {
    setProfiles([]);
    setFilteredProfiles([]);
    setCurrentFilters(null);
    setStats({ total: 0 });
    setScoreFilter(0);
    setSearchComplete(false);
    setSearchProgress({
      isSearching: false,
      message: '',
      percent: 0
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSearch(searchFilters);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔍 Search Developers</h1>
        <button 
          style={styles.btnSecondary}
          onClick={() => navigate('/saved-lists')}
        >
          View Saved Lists
        </button>
      </div>

      {/* Search Form */}
      <div style={styles.searchForm}>
        <form onSubmit={handleFormSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Role</label>
              <select
                style={styles.input}
                value={searchFilters.role}
                onChange={(e) => setSearchFilters({...searchFilters, role: e.target.value})}
              >
                <option value="">Any Role</option>
                <option value="frontend">Frontend</option>
                <option value="backend">Backend</option>
                <option value="fullstack">Full Stack</option>
                <option value="mobile">Mobile</option>
                <option value="devops">DevOps</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Location</label>
              <input
                type="text"
                style={styles.input}
                placeholder="e.g. Seattle, San Francisco"
                value={searchFilters.location}
                onChange={(e) => setSearchFilters({...searchFilters, location: e.target.value})}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Min Repos</label>
              <input
                type="number"
                style={styles.input}
                min="0"
                value={searchFilters.min_repos}
                onChange={(e) => setSearchFilters({...searchFilters, min_repos: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? 'Searching...' : 'Search Developers'}
            </button>
            {currentFilters && (
              <button type="button" style={styles.btnSecondary} onClick={handleResetSearch}>
                Reset Search
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div style={styles.errorBox}>
          ❌ {error}
        </div>
      )}

      {/* ✅ SMOOTH PROGRESS BAR (No phases, side-placed count) */}
      {searchProgress.isSearching && (
        <div style={styles.progressContainer}>
          <div style={styles.progressContent}>
            <div style={styles.progressLeft}>
              <span style={styles.progressMessage}>{searchProgress.message}</span>
              <div style={styles.progressBarContainer}>
                <div 
                  style={{...styles.progressBarFill, width: `${searchProgress.percent}%`}}
                />
              </div>
            </div>
            <div style={styles.progressStats}>
              <span style={styles.statValue}>{stats.total}</span>
              <span style={styles.statLabel}>found</span>
            </div>
          </div>
        </div>
      )}

      {/* Results section with score filter */}
      {profiles.length > 0 && (
        <>
          {/* ✅ Stats bar - side placement, not prominent */}
          <div style={styles.resultsHeader}>
            <div style={styles.resultsInfo}>
              <span style={styles.resultsCount}>{filteredProfiles.length} developers</span>
              {scoreFilter > 0 && (
                <span style={styles.filterBadge}>Score ≥ {scoreFilter}</span>
              )}
            </div>
            
            {/* ✅ Score filter - disabled during search */}
            <div style={styles.scoreFilterContainer}>
              <label htmlFor="score-filter" style={styles.scoreFilterLabel}>
                Developer Score:
                {!searchComplete && <span style={styles.filterDisabledHint}> (searching...)</span>}
              </label>
              <input
                id="score-filter"
                type="range"
                min="0"
                max="100"
                step="10"
                value={scoreFilter}
                onChange={handleScoreFilterChange}
                disabled={!searchComplete}
                style={{
                  ...styles.scoreSlider,
                  ...(searchComplete ? {} : styles.scoreSliderDisabled)
                }}
              />
              <span style={styles.scoreValue}>{scoreFilter}</span>
            </div>

            {currentFilters && (
              <button style={styles.btnSmall} onClick={handleResetSearch}>
                New Search
              </button>
            )}
          </div>

          {/* Profile Grid */}
          <div style={styles.profilesGrid}>
            {filteredProfiles.map(profile => (
              <div key={profile.id} style={styles.profileCard}>
                <div style={styles.profileHeader}>
                  <img 
                    src={profile.avatar_url || 'https://via.placeholder.com/50'} 
                    alt={profile.github_username}
                    style={styles.avatar}
                  />
                  <div style={styles.profileInfo}>
                    <h3 style={styles.profileName}>{profile.name || profile.github_username}</h3>
                    <p style={styles.profileUsername}>@{profile.github_username}</p>
                  </div>
                </div>

                <div style={styles.profileStats}>
                  <div style={styles.stat}>
                    <span style={styles.statNumber}>{profile.developer_score}</span>
                    <span style={styles.statText}>Score</span>
                  </div>
                  <div style={styles.stat}>
                    <span style={styles.statNumber}>{profile.total_stars}</span>
                    <span style={styles.statText}>Stars</span>
                  </div>
                  <div style={styles.stat}>
                    <span style={styles.statNumber}>{profile.public_repos}</span>
                    <span style={styles.statText}>Repos</span>
                  </div>
                </div>

                {profile.location && (
                  <p style={styles.profileLocation}>📍 {profile.location}</p>
                )}

                {profile.primary_language && (
                  <div style={styles.languageBadge}>{profile.primary_language}</div>
                )}

                <button
                  onClick={() => handleSelectToggle(profile.id)}
                  style={{
                    ...styles.selectButton,
                    ...(profile.selected ? styles.selectButtonActive : {})
                  }}
                >
                  {profile.selected ? '✓ Selected' : 'Select'}
                </button>
              </div>
            ))}
          </div>

          {filteredProfiles.length === 0 && scoreFilter > 0 && (
            <div style={styles.noResults}>
              No developers found with score ≥ {scoreFilter}. Try lowering the filter.
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && profiles.length === 0 && !searchProgress.isSearching && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔍</div>
          <h2 style={styles.emptyTitle}>Start Your Search</h2>
          <p style={styles.emptyText}>
            Use the filters above to find talented developers
          </p>
        </div>
      )}
    </div>
  );
}

// ===== INLINE STYLES =====
const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },

  title: {
    fontSize: '2rem',
    color: '#2c3e50',
    fontWeight: '700'
  },

  // Search Form
  searchForm: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },

  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },

  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#2c3e50'
  },

  input: {
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontFamily: "'Outfit', sans-serif",
    transition: 'border-color 0.2s'
  },

  btnPrimary: {
    padding: '0.875rem 1.5rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: "'Outfit', sans-serif"
  },

  btnSecondary: {
    padding: '0.875rem 1.5rem',
    background: 'white',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: "'Outfit', sans-serif"
  },

  btnSmall: {
    padding: '0.5rem 1rem',
    background: 'white',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif"
  },

  // Error
  errorBox: {
    background: '#fee',
    borderLeft: '4px solid #f44',
    padding: '1rem',
    marginBottom: '1rem',
    borderRadius: '4px',
    color: '#c33'
  },

  // ✅ SMOOTH PROGRESS BAR (No phases)
  progressContainer: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)'
  },

  progressContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '2rem'
  },

  progressLeft: {
    flex: 1
  },

  progressMessage: {
    color: 'white',
    fontSize: '1rem',
    fontWeight: '500',
    display: 'block',
    marginBottom: '0.75rem'
  },

  progressBarContainer: {
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    height: '8px',
    overflow: 'hidden'
  },

  progressBarFill: {
    background: 'white',
    height: '100%',
    borderRadius: '8px',
    transition: 'width 0.3s ease'
  },

  // ✅ Side-placed stats (not prominent)
  progressStats: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.15)',
    padding: '0.75rem 1.25rem',
    borderRadius: '8px',
    minWidth: '80px'
  },

  statValue: {
    color: 'white',
    fontSize: '1.75rem',
    fontWeight: '700',
    lineHeight: 1
  },

  statLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '0.25rem'
  },

  // ✅ Results header with score filter
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    background: 'white',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    flexWrap: 'wrap',
    gap: '1rem'
  },

  resultsInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },

  resultsCount: {
    fontSize: '1rem',
    color: '#2c3e50',
    fontWeight: '600'
  },

  filterBadge: {
    background: '#667eea',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '500'
  },

  // ✅ Score filter with disabled state
  scoreFilterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },

  scoreFilterLabel: {
    fontSize: '0.9rem',
    color: '#2c3e50',
    fontWeight: '500'
  },

  filterDisabledHint: {
    color: '#94a3b8',
    fontWeight: '400',
    fontSize: '0.85rem'
  },

  scoreSlider: {
    width: '180px',
    height: '6px',
    borderRadius: '3px',
    background: '#e2e8f0',
    outline: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer'
  },

  scoreSliderDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed'
  },

  scoreValue: {
    fontWeight: '600',
    color: '#667eea',
    minWidth: '30px',
    textAlign: 'center'
  },

  // Profile Grid
  profilesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '1.5rem',
    marginTop: '1.5rem'
  },

  profileCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer'
  },

  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },

  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    objectFit: 'cover'
  },

  profileInfo: {
    flex: 1
  },

  profileName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '0.25rem'
  },

  profileUsername: {
    fontSize: '0.9rem',
    color: '#64748b'
  },

  profileStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    padding: '1rem 0',
    borderTop: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '1rem'
  },

  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem'
  },

  statNumber: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#667eea'
  },

  statText: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  profileLocation: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '0.75rem'
  },

  languageBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    background: '#f0f9ff',
    color: '#0369a1',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '500',
    marginBottom: '1rem'
  },

  selectButton: {
    width: '100%',
    padding: '0.75rem',
    background: 'white',
    border: '2px solid #667eea',
    borderRadius: '8px',
    color: '#667eea',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: "'Outfit', sans-serif"
  },

  selectButtonActive: {
    background: '#667eea',
    color: 'white'
  },

  // Empty States
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
  },

  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },

  emptyTitle: {
    color: '#2c3e50',
    marginBottom: '0.5rem',
    fontSize: '1.5rem',
    fontWeight: '600'
  },

  emptyText: {
    color: '#64748b',
    fontSize: '1rem'
  },

  noResults: {
    textAlign: 'center',
    padding: '3rem 2rem',
    background: '#fef3c7',
    border: '2px dashed #fbbf24',
    borderRadius: '8px',
    color: '#92400e',
    fontWeight: '500'
  }
};

export default SearchDashboard;