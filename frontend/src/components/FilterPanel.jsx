import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

// ===== CONSTANTS =====
const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'Frontend Developer', label: 'Frontend Developer' },
  { value: 'Backend Developer', label: 'Backend Developer' },
  { value: 'Full-Stack Developer', label: 'Full-Stack Developer' },
  { value: 'Mobile Developer', label: 'Mobile Developer' },
  { value: 'DevOps Engineer', label: 'DevOps Engineer' },
  { value: 'Data Scientist', label: 'Data Scientist' },
  { value: 'AI/ML Engineer', label: 'AI/ML Engineer' },
  { value: 'Data Engineer', label: 'Data Engineer' },
  { value: 'Security Engineer', label: 'Security Engineer' },
  { value: 'QA Engineer', label: 'QA Engineer' },
  { value: 'Blockchain Developer', label: 'Blockchain Developer' },
  { value: 'Game Developer', label: 'Game Developer' },
  { value: 'Embedded Engineer', label: 'Embedded/IoT Engineer' },
  { value: 'Software Developer', label: 'Software Developer (General)' },
];

const LOCATION_OPTIONS = [
  { value: '', label: 'All US Locations' },

  // Tier 1: Major Tech Hubs
  { value: 'San Francisco', label: '📍 San Francisco, CA' },
  { value: 'New York', label: '📍 New York, NY' },
  { value: 'Seattle', label: '📍 Seattle, WA' },
  { value: 'Austin', label: '📍 Austin, TX' },
  { value: 'Los Angeles', label: '📍 Los Angeles, CA' },
  { value: 'Boston', label: '📍 Boston, MA' },
  { value: 'Chicago', label: '📍 Chicago, IL' },
  { value: 'Denver', label: '📍 Denver, CO' },
  { value: 'Atlanta', label: '📍 Atlanta, GA' },
  { value: 'San Diego', label: '📍 San Diego, CA' },

  // Tier 2: Growing Tech Cities
  { value: 'Portland', label: '📍 Portland, OR' },
  { value: 'Phoenix', label: '📍 Phoenix, AZ' },
  { value: 'Dallas', label: '📍 Dallas, TX' },
  { value: 'Houston', label: '📍 Houston, TX' },
  { value: 'Miami', label: '📍 Miami, FL' },
  { value: 'Washington DC', label: '📍 Washington, DC' },
  { value: 'Philadelphia', label: '📍 Philadelphia, PA' },
  { value: 'Minneapolis', label: '📍 Minneapolis, MN' },
  { value: 'Detroit', label: '📍 Detroit, MI' },
  { value: 'Charlotte', label: '📍 Charlotte, NC' },
  { value: 'Nashville', label: '📍 Nashville, TN' },
  { value: 'Raleigh', label: '📍 Raleigh, NC' },
  { value: 'Salt Lake City', label: '📍 Salt Lake City, UT' },
  { value: 'Pittsburgh', label: '📍 Pittsburgh, PA' },
  { value: 'Columbus', label: '📍 Columbus, OH' },
  { value: 'Indianapolis', label: '📍 Indianapolis, IN' },
  { value: 'Kansas City', label: '📍 Kansas City, MO' },
  { value: 'Tampa', label: '📍 Tampa, FL' },
  { value: 'Orlando', label: '📍 Orlando, FL' },
  { value: 'San Antonio', label: '📍 San Antonio, TX' },

  // Tier 3: Secondary Markets
  { value: 'St Louis', label: '📍 St. Louis, MO' },
  { value: 'Baltimore', label: '📍 Baltimore, MD' },
  { value: 'Cleveland', label: '📍 Cleveland, OH' },
  { value: 'Cincinnati', label: '📍 Cincinnati, OH' },
  { value: 'Milwaukee', label: '📍 Milwaukee, WI' },
  { value: 'Sacramento', label: '📍 Sacramento, CA' },
  { value: 'Las Vegas', label: '📍 Las Vegas, NV' },
  { value: 'New Orleans', label: '📍 New Orleans, LA' },
  { value: 'Jacksonville', label: '📍 Jacksonville, FL' },
  { value: 'Richmond', label: '📍 Richmond, VA' },
  { value: 'Hartford', label: '📍 Hartford, CT' },
  { value: 'Providence', label: '📍 Providence, RI' },
  { value: 'Buffalo', label: '📍 Buffalo, NY' },
  { value: 'Rochester', label: '📍 Rochester, NY' },
  { value: 'Madison', label: '📍 Madison, WI' },
  { value: 'Ann Arbor', label: '📍 Ann Arbor, MI' },
  { value: 'Boulder', label: '📍 Boulder, CO' },
  { value: 'Provo', label: '📍 Provo, UT' },
  { value: 'Boise', label: '📍 Boise, ID' },
  { value: 'Albuquerque', label: '📍 Albuquerque, NM' },
];

const LANGUAGE_OPTIONS = [
  // Tier 1: Most Popular
  { value: 'Python', label: 'Python', tier: 1 },
  { value: 'JavaScript', label: 'JavaScript', tier: 1 },
  { value: 'TypeScript', label: 'TypeScript', tier: 1 },
  { value: 'Java', label: 'Java', tier: 1 },
  { value: 'Go', label: 'Go', tier: 1 },
  { value: 'Rust', label: 'Rust', tier: 1 },
  { value: 'C++', label: 'C++', tier: 1 },
  { value: 'C#', label: 'C#', tier: 1 },
  { value: 'C', label: 'C', tier: 1 },
  { value: 'Ruby', label: 'Ruby', tier: 1 },
  { value: 'PHP', label: 'PHP', tier: 1 },
  { value: 'Swift', label: 'Swift', tier: 1 },
  { value: 'Kotlin', label: 'Kotlin', tier: 1 },

  // Tier 2: Common
  { value: 'Scala', label: 'Scala', tier: 2 },
  { value: 'R', label: 'R', tier: 2 },
  { value: 'Dart', label: 'Dart', tier: 2 },
  { value: 'Shell', label: 'Shell/Bash', tier: 2 },
  { value: 'Objective-C', label: 'Objective-C', tier: 2 },
  { value: 'Perl', label: 'Perl', tier: 2 },
  { value: 'Lua', label: 'Lua', tier: 2 },

  // Tier 3: Specialized
  { value: 'Elixir', label: 'Elixir', tier: 3 },
  { value: 'Clojure', label: 'Clojure', tier: 3 },
  { value: 'Haskell', label: 'Haskell', tier: 3 },
  { value: 'F#', label: 'F#', tier: 3 },
  { value: 'Julia', label: 'Julia', tier: 3 },
  { value: 'MATLAB', label: 'MATLAB', tier: 3 },
  { value: 'Groovy', label: 'Groovy', tier: 3 },
  { value: 'PowerShell', label: 'PowerShell', tier: 3 },
];

const FilterPanel = ({ onApplyFilters, initialFilters = {}, onReset }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filters, setFilters] = useState({
    role: initialFilters.role || '',
    location: initialFilters.location || '',
    languages: initialFilters.languages || [],
  });
  const toggleLanguage = (langValue) => {
    setFilters(prev => ({
      ...prev,
      languages: prev.languages.includes(langValue)
        ? prev.languages.filter(l => l !== langValue)
        : [...prev.languages, langValue]
    }));
  };

  const handleReset = () => {
    setFilters({ role: '', location: '', languages: [] });
    if (onReset) {
      onReset();
    }
  };

  const handleApply = () => {
    onApplyFilters({
      role: filters.role || null,
      location: filters.location || null,
      languages: filters.languages.length > 0 ? filters.languages : null,
    });
  };

  const activeFilterCount = [filters.role, filters.location, filters.languages.length > 0].filter(Boolean).length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={styles.headerLeft}>
          <h3 style={styles.title}>Search Filters</h3>
          {activeFilterCount > 0 && (
            <span style={styles.badge}>{activeFilterCount} active</span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {/* Filters */}
      {isExpanded && (
        <div style={styles.content}>
          {/* Role Filter */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>Role</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              style={styles.select}
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>Location</label>
            <select
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              style={styles.select}
            >
              {LOCATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Languages Filter */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>
              Programming Languages
              {filters.languages.length > 0 && (
                <span style={styles.langCount}>
                  ({filters.languages.length} selected)
                </span>
              )}
            </label>

            <div style={styles.langGrid}>
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => toggleLanguage(lang.value)}
                  style={{
                    ...styles.langChip,
                    ...(filters.languages.includes(lang.value) ? styles.langChipSelected : {}),
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {/* Selected Languages Display */}
            {filters.languages.length > 0 && (
              <p style={styles.selectedLangs}>
                Selected: {filters.languages.join(', ')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button onClick={handleReset} style={styles.resetButton}>
              Reset All
            </button>
            <button onClick={handleApply} style={styles.applyButton}>
              <Search size={18} style={{ marginRight: '8px' }} />
              Search Developers
            </button>
          </div>
          <p style={styles.helperText}>
            Searches 100,000+ US developers
          </p>
        </div>
      )}
    </div>
  );
};

// ===== STYLES =====
const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    cursor: 'pointer',
    borderBottom: '1px solid #e5e7eb',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  badge: {
    backgroundColor: '#FF6B35',
    color: '#ffffff',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  },
  content: {
    padding: '24px',
  },
  filterGroup: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    marginBottom: '10px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#374151',
  },
  select: {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    fontSize: '16px',
    fontFamily: 'Outfit, sans-serif',
    color: '#374151',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s',
    appearance: 'auto',
    boxSizing: 'border-box',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  resetButton: {
    flex: 1,
    padding: '14px 24px',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#374151',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'Outfit, sans-serif',
  },
  applyButton: {
    flex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 24px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#FF6B35',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'Outfit, sans-serif',
  },
  helperText: {
    fontSize: '13px',
    color: '#9ca3af',
    marginTop: '12px',
    textAlign: 'center',
  },
  langCount: {
    marginLeft: '8px',
    color: '#FF6B35',
    fontWeight: 400,
    fontSize: '14px',
  },
  langGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  langChip: {
    padding: '8px 14px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'Outfit, sans-serif',
  },
  langChipSelected: {
    backgroundColor: '#FF6B35',
    color: '#ffffff',
    borderColor: '#FF6B35',
    boxShadow: '0 1px 3px rgba(255, 107, 53, 0.3)',
  },
  showMoreBtn: {
    marginTop: '10px',
    fontSize: '14px',
    color: '#FF6B35',
    fontWeight: 500,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'Outfit, sans-serif',
  },
  selectedLangs: {
    fontSize: '13px',
    color: '#9ca3af',
    marginTop: '8px',
  },
};

export default FilterPanel;
