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

const FilterPanel = ({ onApplyFilters, initialFilters = {}, onReset }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filters, setFilters] = useState({
    role: initialFilters.role || '',
    location: initialFilters.location || '',
  });

  const handleReset = () => {
    setFilters({ role: '', location: '' });
    if (onReset) {
      onReset();
    }
  };

  const handleApply = () => {
    onApplyFilters({ role: filters.role, location: filters.location });
  };

  const activeFilterCount = [filters.role, filters.location].filter(Boolean).length;

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
};

export default FilterPanel;
