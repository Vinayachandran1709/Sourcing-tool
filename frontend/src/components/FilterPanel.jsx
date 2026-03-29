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

const US_CITIES = [
  { value: 'San Francisco', label: 'San Francisco, CA' },
  { value: 'New York', label: 'New York, NY' },
  { value: 'Seattle', label: 'Seattle, WA' },
  { value: 'Austin', label: 'Austin, TX' },
  { value: 'Los Angeles', label: 'Los Angeles, CA' },
  { value: 'Boston', label: 'Boston, MA' },
  { value: 'Chicago', label: 'Chicago, IL' },
  { value: 'Denver', label: 'Denver, CO' },
  { value: 'Atlanta', label: 'Atlanta, GA' },
  { value: 'San Diego', label: 'San Diego, CA' },
  { value: 'Portland', label: 'Portland, OR' },
  { value: 'Phoenix', label: 'Phoenix, AZ' },
  { value: 'Dallas', label: 'Dallas, TX' },
  { value: 'Houston', label: 'Houston, TX' },
  { value: 'Miami', label: 'Miami, FL' },
  { value: 'Washington DC', label: 'Washington, DC' },
  { value: 'Philadelphia', label: 'Philadelphia, PA' },
  { value: 'Minneapolis', label: 'Minneapolis, MN' },
  { value: 'Detroit', label: 'Detroit, MI' },
  { value: 'Charlotte', label: 'Charlotte, NC' },
  { value: 'Nashville', label: 'Nashville, TN' },
  { value: 'Raleigh', label: 'Raleigh, NC' },
  { value: 'Salt Lake City', label: 'Salt Lake City, UT' },
  { value: 'Pittsburgh', label: 'Pittsburgh, PA' },
  { value: 'Columbus', label: 'Columbus, OH' },
];

const INDIA_CITIES = [
  { value: 'Bangalore', label: 'Bangalore, Karnataka' },
  { value: 'Mumbai', label: 'Mumbai, Maharashtra' },
  { value: 'Hyderabad', label: 'Hyderabad, Telangana' },
  { value: 'Delhi', label: 'Delhi, NCR' },
  { value: 'Pune', label: 'Pune, Maharashtra' },
  { value: 'Chennai', label: 'Chennai, Tamil Nadu' },
  { value: 'Gurgaon', label: 'Gurgaon, Haryana' },
  { value: 'Noida', label: 'Noida, UP' },
  { value: 'Kolkata', label: 'Kolkata, West Bengal' },
  { value: 'Ahmedabad', label: 'Ahmedabad, Gujarat' },
  { value: 'Jaipur', label: 'Jaipur, Rajasthan' },
  { value: 'Lucknow', label: 'Lucknow, UP' },
  { value: 'Chandigarh', label: 'Chandigarh' },
  { value: 'Kochi', label: 'Kochi, Kerala' },
  { value: 'Coimbatore', label: 'Coimbatore, Tamil Nadu' },
  { value: 'Indore', label: 'Indore, MP' },
  { value: 'Nagpur', label: 'Nagpur, Maharashtra' },
  { value: 'Trivandrum', label: 'Trivandrum, Kerala' },
  { value: 'Visakhapatnam', label: 'Visakhapatnam, AP' },
  { value: 'Bhopal', label: 'Bhopal, MP' },
  { value: 'Surat', label: 'Surat, Gujarat' },
  { value: 'Vadodara', label: 'Vadodara, Gujarat' },
  { value: 'Mysore', label: 'Mysore, Karnataka' },
  { value: 'Mangalore', label: 'Mangalore, Karnataka' },
  { value: 'Bhubaneswar', label: 'Bhubaneswar, Odisha' },
  { value: 'Dehradun', label: 'Dehradun, Uttarakhand' },
  { value: 'Guwahati', label: 'Guwahati, Assam' },
  { value: 'Patna', label: 'Patna, Bihar' },
  { value: 'Ranchi', label: 'Ranchi, Jharkhand' },
  { value: 'Madurai', label: 'Madurai, Tamil Nadu' },
  { value: 'Nashik', label: 'Nashik, Maharashtra' },
  { value: 'Rajkot', label: 'Rajkot, Gujarat' },
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

// Specialization presets per role — maps to language filters only, no backend changes
const ROLE_SPECIALIZATIONS = {
  'Mobile Developer': [
    { label: 'All Mobile', languages: [] },
    { label: 'iOS (Swift)', languages: ['Swift', 'Objective-C'] },
    { label: 'Android (Kotlin)', languages: ['Kotlin', 'Java'] },
    { label: 'Flutter (Dart)', languages: ['Dart'] },
    { label: 'React Native', languages: ['JavaScript', 'TypeScript'] },
  ],
  'Frontend Developer': [
    { label: 'All Frontend', languages: [] },
    { label: 'React', languages: ['JavaScript', 'TypeScript'] },
    { label: 'Angular', languages: ['TypeScript'] },
    { label: 'Vue', languages: ['JavaScript', 'TypeScript'] },
  ],
  'Backend Developer': [
    { label: 'All Backend', languages: [] },
    { label: 'Python', languages: ['Python'] },
    { label: 'Node.js', languages: ['JavaScript', 'TypeScript'] },
    { label: 'Java', languages: ['Java'] },
    { label: 'Go', languages: ['Go'] },
    { label: 'Rust', languages: ['Rust'] },
    { label: 'Ruby', languages: ['Ruby'] },
    { label: 'PHP', languages: ['PHP'] },
    { label: 'C# / .NET', languages: ['C#'] },
  ],
  'Full-Stack Developer': [
    { label: 'All Full-Stack', languages: [] },
    { label: 'MERN / MEAN', languages: ['JavaScript', 'TypeScript'] },
    { label: 'Python + JS', languages: ['Python', 'JavaScript'] },
    { label: 'Go + TS', languages: ['Go', 'TypeScript'] },
    { label: 'Ruby + JS', languages: ['Ruby', 'JavaScript'] },
    { label: 'Java + JS', languages: ['Java', 'JavaScript'] },
  ],
  'DevOps Engineer': [
    { label: 'All DevOps', languages: [] },
    { label: 'Python DevOps', languages: ['Python'] },
    { label: 'Go DevOps', languages: ['Go'] },
    { label: 'Shell / Bash', languages: ['Shell'] },
  ],
  'AI/ML Engineer': [
    { label: 'All AI/ML', languages: [] },
    { label: 'Python ML', languages: ['Python'] },
    { label: 'R + Python', languages: ['R', 'Python'] },
    { label: 'Julia', languages: ['Julia'] },
  ],
  'Data Scientist': [
    { label: 'All Data Science', languages: [] },
    { label: 'Python', languages: ['Python'] },
    { label: 'R', languages: ['R'] },
    { label: 'Python + R', languages: ['Python', 'R'] },
  ],
  'Data Engineer': [
    { label: 'All Data Eng', languages: [] },
    { label: 'Python', languages: ['Python'] },
    { label: 'Scala / Spark', languages: ['Scala'] },
    { label: 'Java', languages: ['Java'] },
    { label: 'SQL + Python', languages: ['Python'] },
  ],
  'Security Engineer': [
    { label: 'All Security', languages: [] },
    { label: 'Python', languages: ['Python'] },
    { label: 'Go', languages: ['Go'] },
    { label: 'Rust', languages: ['Rust'] },
    { label: 'C / C++', languages: ['C', 'C++'] },
  ],
  'Game Developer': [
    { label: 'All Game Dev', languages: [] },
    { label: 'Unity (C#)', languages: ['C#'] },
    { label: 'Unreal (C++)', languages: ['C++'] },
    { label: 'Lua', languages: ['Lua'] },
  ],
  'Blockchain Developer': [
    { label: 'All Blockchain', languages: [] },
    { label: 'Solidity / JS', languages: ['JavaScript', 'TypeScript'] },
    { label: 'Rust', languages: ['Rust'] },
    { label: 'Go', languages: ['Go'] },
  ],
  'Embedded Engineer': [
    { label: 'All Embedded', languages: [] },
    { label: 'C / C++', languages: ['C', 'C++'] },
    { label: 'Rust', languages: ['Rust'] },
    { label: 'Python', languages: ['Python'] },
  ],
};

const FilterPanel = ({ onApplyFilters, initialFilters = {}, onReset }) => {
  const [filters, setFilters] = useState({
    role: initialFilters.role || '',
    location: initialFilters.location || '',
    languages: initialFilters.languages || [],
  });
  const [activeSpecLabel, setActiveSpecLabel] = useState(null);
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  const specializations = ROLE_SPECIALIZATIONS[filters.role] || null;

  const toggleLanguage = (langValue) => {
    setActiveSpecLabel(null);
    setFilters(prev => ({
      ...prev,
      languages: prev.languages.includes(langValue)
        ? prev.languages.filter(l => l !== langValue)
        : [...prev.languages, langValue]
    }));
  };

  const applySpecialization = (spec) => {
    setActiveSpecLabel(spec.label);
    setFilters(prev => ({ ...prev, languages: spec.languages }));
  };

  const handleRoleChange = (newRole) => {
    setActiveSpecLabel(null);
    setShowAllLanguages(false);
    setFilters(prev => ({ ...prev, role: newRole, languages: [] }));
  };

  const handleReset = () => {
    setFilters({ role: '', location: '', languages: [] });
    setActiveSpecLabel(null);
    setShowAllLanguages(false);
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
            <span style={styles.activeBadge}>{activeFilterCount} active</span>
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
              onChange={(e) => handleRoleChange(e.target.value)}
              style={styles.select}
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.dropdownCol}>
            <label style={styles.fieldLabel}>Location</label>
            <style>{`
              .location-select optgroup {
                color: #EA580C;
                font-weight: 700;
                font-size: 14px;
                padding: 8px 0 4px;
                font-style: normal;
              }
              .location-select option {
                color: #1f2937;
                font-weight: 400;
                padding: 4px 8px;
              }
            `}</style>
            <select
              className="location-select"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              style={styles.select}
            >
              <option value="">All Locations</option>
              <optgroup label="United States">
                {US_CITIES.map((city) => (
                  <option key={city.value} value={city.value}>{city.label}</option>
                ))}
              </optgroup>
              <optgroup label="India">
                {INDIA_CITIES.map((city) => (
                  <option key={city.value} value={city.value}>{city.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Specialization chips — appears when a role is selected */}
        {specializations && (
          <div style={styles.specSection}>
            <label style={styles.specLabel}>Specialization</label>
            <div style={styles.specGrid}>
              {specializations.map((spec) => {
                const isActive = activeSpecLabel === spec.label;
                return (
                  <button
                    key={spec.label}
                    type="button"
                    onClick={() => applySpecialization(spec)}
                    style={{
                      ...styles.specChip,
                      ...(isActive ? styles.specChipActive : {}),
                    }}
                  >
                    {spec.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={styles.divider} />

        {/* Languages */}
        <div>
          <div style={styles.langHeader}>
            <label style={styles.fieldLabel}>
              {specializations ? 'Additional Languages' : 'Programming Languages'}
            </label>
            {filters.languages.length > 0 && (
              <span style={styles.langBadge}>{filters.languages.length} selected</span>
            )}
          </div>

          {/* If specializations are shown, collapse languages by default */}
          {specializations && !showAllLanguages ? (
            <button
              type="button"
              onClick={() => setShowAllLanguages(true)}
              style={styles.showLangsBtn}
            >
              Show all languages to refine further
            </button>
          ) : (
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
          )}
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
  specSection: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #f3f4f6',
  },
  specLabel: {
    display: 'block',
    marginBottom: '12px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  specGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  specChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 18px',
    borderRadius: '100px',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: 'Outfit, system-ui, sans-serif',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  specChipActive: {
    backgroundColor: '#FF6B35',
    color: '#ffffff',
    borderColor: '#FF6B35',
    boxShadow: '0 2px 6px rgba(255,107,53,0.25)',
    fontWeight: 600,
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
  showLangsBtn: {
    padding: '10px 0',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: 'Outfit, system-ui, sans-serif',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: '1px dashed #d1d5db',
    borderRadius: '10px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
    transition: 'all 0.15s ease',
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
