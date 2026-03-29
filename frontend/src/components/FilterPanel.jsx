import React, { useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';

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
  { value: '', label: 'All Locations' },

  // === UNITED STATES ===
  { value: 'US_DIVIDER', label: '── United States ──', disabled: true },

  // Tier 1: Major US Tech Hubs
  { value: 'San Francisco', label: '\u{1F1FA}\u{1F1F8} San Francisco, CA' },
  { value: 'New York', label: '\u{1F1FA}\u{1F1F8} New York, NY' },
  { value: 'Seattle', label: '\u{1F1FA}\u{1F1F8} Seattle, WA' },
  { value: 'Austin', label: '\u{1F1FA}\u{1F1F8} Austin, TX' },
  { value: 'Los Angeles', label: '\u{1F1FA}\u{1F1F8} Los Angeles, CA' },
  { value: 'Boston', label: '\u{1F1FA}\u{1F1F8} Boston, MA' },
  { value: 'Chicago', label: '\u{1F1FA}\u{1F1F8} Chicago, IL' },
  { value: 'Denver', label: '\u{1F1FA}\u{1F1F8} Denver, CO' },
  { value: 'Atlanta', label: '\u{1F1FA}\u{1F1F8} Atlanta, GA' },
  { value: 'San Diego', label: '\u{1F1FA}\u{1F1F8} San Diego, CA' },

  // Tier 2: Growing US Tech Cities
  { value: 'Portland', label: '\u{1F1FA}\u{1F1F8} Portland, OR' },
  { value: 'Phoenix', label: '\u{1F1FA}\u{1F1F8} Phoenix, AZ' },
  { value: 'Dallas', label: '\u{1F1FA}\u{1F1F8} Dallas, TX' },
  { value: 'Houston', label: '\u{1F1FA}\u{1F1F8} Houston, TX' },
  { value: 'Miami', label: '\u{1F1FA}\u{1F1F8} Miami, FL' },
  { value: 'Washington DC', label: '\u{1F1FA}\u{1F1F8} Washington, DC' },
  { value: 'Philadelphia', label: '\u{1F1FA}\u{1F1F8} Philadelphia, PA' },
  { value: 'Minneapolis', label: '\u{1F1FA}\u{1F1F8} Minneapolis, MN' },
  { value: 'Detroit', label: '\u{1F1FA}\u{1F1F8} Detroit, MI' },
  { value: 'Charlotte', label: '\u{1F1FA}\u{1F1F8} Charlotte, NC' },
  { value: 'Nashville', label: '\u{1F1FA}\u{1F1F8} Nashville, TN' },
  { value: 'Raleigh', label: '\u{1F1FA}\u{1F1F8} Raleigh, NC' },
  { value: 'Salt Lake City', label: '\u{1F1FA}\u{1F1F8} Salt Lake City, UT' },
  { value: 'Pittsburgh', label: '\u{1F1FA}\u{1F1F8} Pittsburgh, PA' },
  { value: 'Columbus', label: '\u{1F1FA}\u{1F1F8} Columbus, OH' },

  // === INDIA ===
  { value: 'INDIA_DIVIDER', label: '── India ──', disabled: true },

  // Tier 1: Major India Tech Hubs
  { value: 'Bangalore', label: '\u{1F1EE}\u{1F1F3} Bangalore, Karnataka' },
  { value: 'Mumbai', label: '\u{1F1EE}\u{1F1F3} Mumbai, Maharashtra' },
  { value: 'Hyderabad', label: '\u{1F1EE}\u{1F1F3} Hyderabad, Telangana' },
  { value: 'Delhi', label: '\u{1F1EE}\u{1F1F3} Delhi, NCR' },
  { value: 'Pune', label: '\u{1F1EE}\u{1F1F3} Pune, Maharashtra' },
  { value: 'Chennai', label: '\u{1F1EE}\u{1F1F3} Chennai, Tamil Nadu' },
  { value: 'Gurgaon', label: '\u{1F1EE}\u{1F1F3} Gurgaon, Haryana' },
  { value: 'Noida', label: '\u{1F1EE}\u{1F1F3} Noida, UP' },
  { value: 'Kolkata', label: '\u{1F1EE}\u{1F1F3} Kolkata, West Bengal' },
  { value: 'Ahmedabad', label: '\u{1F1EE}\u{1F1F3} Ahmedabad, Gujarat' },

  // Tier 2: Growing India Tech Cities
  { value: 'Jaipur', label: '\u{1F1EE}\u{1F1F3} Jaipur, Rajasthan' },
  { value: 'Lucknow', label: '\u{1F1EE}\u{1F1F3} Lucknow, UP' },
  { value: 'Chandigarh', label: '\u{1F1EE}\u{1F1F3} Chandigarh' },
  { value: 'Kochi', label: '\u{1F1EE}\u{1F1F3} Kochi, Kerala' },
  { value: 'Coimbatore', label: '\u{1F1EE}\u{1F1F3} Coimbatore, Tamil Nadu' },
  { value: 'Indore', label: '\u{1F1EE}\u{1F1F3} Indore, MP' },
  { value: 'Nagpur', label: '\u{1F1EE}\u{1F1F3} Nagpur, Maharashtra' },
  { value: 'Trivandrum', label: '\u{1F1EE}\u{1F1F3} Trivandrum, Kerala' },
  { value: 'Visakhapatnam', label: '\u{1F1EE}\u{1F1F3} Visakhapatnam, AP' },
  { value: 'Bhopal', label: '\u{1F1EE}\u{1F1F3} Bhopal, MP' },
  { value: 'Surat', label: '\u{1F1EE}\u{1F1F3} Surat, Gujarat' },
  { value: 'Vadodara', label: '\u{1F1EE}\u{1F1F3} Vadodara, Gujarat' },
  { value: 'Mysore', label: '\u{1F1EE}\u{1F1F3} Mysore, Karnataka' },
  { value: 'Mangalore', label: '\u{1F1EE}\u{1F1F3} Mangalore, Karnataka' },

  // Tier 3: Emerging India Tech Cities
  { value: 'Bhubaneswar', label: '\u{1F1EE}\u{1F1F3} Bhubaneswar, Odisha' },
  { value: 'Dehradun', label: '\u{1F1EE}\u{1F1F3} Dehradun, Uttarakhand' },
  { value: 'Guwahati', label: '\u{1F1EE}\u{1F1F3} Guwahati, Assam' },
  { value: 'Patna', label: '\u{1F1EE}\u{1F1F3} Patna, Bihar' },
  { value: 'Ranchi', label: '\u{1F1EE}\u{1F1F3} Ranchi, Jharkhand' },
  { value: 'Madurai', label: '\u{1F1EE}\u{1F1F3} Madurai, Tamil Nadu' },
  { value: 'Nashik', label: '\u{1F1EE}\u{1F1F3} Nashik, Maharashtra' },
  { value: 'Rajkot', label: '\u{1F1EE}\u{1F1F3} Rajkot, Gujarat' },
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
    <div style={styles.card}>
      {/* Card Header */}
      <div style={styles.cardHeader}>
        <div style={styles.headerRow}>
          <h3 style={styles.heading}>Search Filters</h3>
          {activeFilterCount > 0 && (
            <span style={styles.activebadge}>{activeFilterCount} active</span>
          )}
        </div>
        <p style={styles.subtitle}>Find developers across 150,000+ profiles in US & India</p>
      </div>

      {/* Card Body */}
      <div style={styles.cardBody}>
        {/* Role & Location — side by side */}
        <div style={styles.dropdownRow}>
          <div style={styles.dropdownCol}>
            <label style={styles.fieldLabel}>Role</label>
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

          <div style={styles.dropdownCol}>
            <label style={styles.fieldLabel}>Location</label>
            <select
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              style={styles.select}
            >
              {LOCATION_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  style={option.disabled ? { fontWeight: 700, color: '#6b7280' } : {}}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Languages */}
        <div>
          <div style={styles.langHeader}>
            <label style={styles.fieldLabel}>Programming Languages</label>
            {filters.languages.length > 0 && (
              <span style={styles.langBadge}>{filters.languages.length} selected</span>
            )}
          </div>
          <div style={styles.chipGrid}>
            {LANGUAGE_OPTIONS.map((lang) => {
              const isSelected = filters.languages.includes(lang.value);
              return (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => toggleLanguage(lang.value)}
                  style={{
                    ...styles.chip,
                    ...(isSelected ? styles.chipSelected : {}),
                  }}
                >
                  {isSelected && <span style={styles.checkmark}>&#10003; </span>}
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div style={styles.cardFooter}>
        <button onClick={handleReset} style={styles.resetBtn}>
          <RotateCcw size={15} style={{ marginRight: '6px' }} />
          Reset
        </button>
        <button onClick={handleApply} style={styles.searchBtn}>
          <Search size={16} style={{ marginRight: '8px' }} />
          Search Developers
        </button>
      </div>
    </div>
  );
};

// ===== STYLES =====
const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    marginBottom: '28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '24px 28px 20px',
    borderBottom: '1px solid #f3f4f6',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px',
  },
  heading: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#111827',
    letterSpacing: '-0.01em',
  },
  activeBadge: {
    backgroundColor: '#FFF3ED',
    color: '#EA580C',
    padding: '3px 10px',
    borderRadius: '100px',
    fontSize: '12px',
    fontWeight: 600,
  },
  subtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#9ca3af',
    fontWeight: 400,
  },
  cardBody: {
    padding: '28px',
  },
  dropdownRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  dropdownCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  fieldLabel: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'Outfit, system-ui, sans-serif',
    color: '#1f2937',
    backgroundColor: '#fafafa',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    appearance: 'auto',
    boxSizing: 'border-box',
  },
  divider: {
    height: '1px',
    backgroundColor: '#f3f4f6',
    margin: '28px 0',
  },
  langHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  },
  langBadge: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#EA580C',
    backgroundColor: '#FFF7ED',
    padding: '4px 10px',
    borderRadius: '100px',
  },
  chipGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 16px',
    borderRadius: '100px',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: 'Outfit, system-ui, sans-serif',
    border: '1px solid #e5e7eb',
    backgroundColor: '#fafafa',
    color: '#4b5563',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  chipSelected: {
    backgroundColor: '#FF6B35',
    color: '#ffffff',
    borderColor: '#FF6B35',
    boxShadow: '0 2px 6px rgba(255,107,53,0.25)',
    fontWeight: 600,
  },
  checkmark: {
    fontSize: '11px',
    marginRight: '2px',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px 28px',
    borderTop: '1px solid #f3f4f6',
    backgroundColor: '#fafbfc',
  },
  resetBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'Outfit, system-ui, sans-serif',
    color: '#6b7280',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  searchBtn: {
    flex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: 'Outfit, system-ui, sans-serif',
    color: '#ffffff',
    backgroundColor: '#FF6B35',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 2px 8px rgba(255,107,53,0.25)',
  },
};

export default FilterPanel;
