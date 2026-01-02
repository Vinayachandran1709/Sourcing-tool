import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Search } from 'lucide-react';

// ===== CONSTANT DEFINITIONS =====
const ROLE_OPTIONS = [
  'Frontend Developer',
  'Backend Developer',
  'Full-Stack Developer',
  'Mobile Developer',
  'DevOps Engineer',
  'Data Scientist',
  'AI/ML Engineer',
  'Data Engineer',
  'QA Engineer',
  'Security Engineer'
];

const LANGUAGE_OPTIONS = [
  'JavaScript',
  'Python',
  'Java',
  'TypeScript',
  'C++',
  'C#',
  'Go',
  'Rust',
  'Swift',
  'Kotlin',
  'Ruby',
  'PHP',
  'Scala',
  'R',
  'Dart'
];

const SKILL_OPTIONS = [
  'React',
  'Node.js',
  'Angular',
  'Vue.js',
  'Django',
  'Flask',
  'Spring Boot',
  'Express.js',
  'Docker',
  'Kubernetes',
  'AWS',
  'Azure',
  'GCP',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
  'Redis',
  'GraphQL',
  'REST API',
  'TensorFlow'
];

// ===== NEW: Score, Contribution, and Repo Ranges =====
const SCORE_RANGES = [
  { label: 'Expert (85-100)', min: 85, max: 100, color: '#10b981' },
  { label: 'Senior (70-84)', min: 70, max: 84, color: '#3b82f6' },
  { label: 'Mid-Level (50-69)', min: 50, max: 69, color: '#f59e0b' },
  { label: 'Junior (30-49)', min: 30, max: 49, color: '#8b5cf6' },
  { label: 'Beginner (0-29)', min: 0, max: 29, color: '#6b7280' }
];

const CONTRIBUTION_RANGES = [
  { label: '0-10 (Beginners)', min: 0, max: 10 },
  { label: '10-50 (Hobbyists)', min: 10, max: 50 },
  { label: '50-100 (Regular)', min: 50, max: 100 },
  { label: '100-250 (Active)', min: 100, max: 250 },
  { label: '250-500 (Very Active)', min: 250, max: 500 },
  { label: '500+ (Elite)', min: 500, max: 999999 }
];

const REPO_RANGES = [
  { label: '0-5 (New Developers)', min: 0, max: 5 },
  { label: '5-10 (Some Activity)', min: 5, max: 10 },
  { label: '10-20 (Regular)', min: 10, max: 20 },
  { label: '20-50 (Active)', min: 20, max: 50 },
  { label: '50+ (Very Active)', min: 50, max: 999999 }
];

// ===== COMPONENT =====
const FilterPanel = ({ onApplyFilters, initialFilters = {}, onReset }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filters, setFilters] = useState({
    role: initialFilters.role || '',
    languages: initialFilters.languages || [],
    skills: initialFilters.skills || [],
    scoreRanges: initialFilters.scoreRanges || [], // NEW: Array of {min, max} objects
    contributionRanges: initialFilters.contributionRanges || [], // NEW
    repoRanges: initialFilters.repoRanges || [], // NEW
    location: initialFilters.location || '',
  });

  // Search states
  const [roleSearch, setRoleSearch] = useState('');
  const [languageSearch, setLanguageSearch] = useState('');
  const [skillSearch, setSkillSearch] = useState('');

  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      div[style*="autocompleteOption"]:hover {
        background: #f9fafb !important;
      }
      
      button[style*="roleChip"]:hover {
        background: #FF6B35 !important;
        color: #ffffff !important;
        border-color: #FF6B35 !important;
      }
      
      label[style*="checkboxLabel"]:hover {
        background-color: #f3f4f6 !important;
      }
      
      label[style*="rangeCheckboxLabel"]:hover {
        background-color: #f9fafb !important;
      }
      
      button[style*="resetButton"]:hover {
        background: #f9fafb !important;
      }
      
      button[style*="applyButton"]:hover {
        background: #e85a26 !important;
      }
    `;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // Filtered options
  const filteredRoles = useMemo(() => {
    if (!roleSearch) return ROLE_OPTIONS;
    return ROLE_OPTIONS.filter(role => 
      role.toLowerCase().includes(roleSearch.toLowerCase())
    );
  }, [roleSearch]);

  const filteredLanguages = useMemo(() => {
    if (!languageSearch) return LANGUAGE_OPTIONS;
    return LANGUAGE_OPTIONS.filter(lang => 
      lang.toLowerCase().includes(languageSearch.toLowerCase())
    );
  }, [languageSearch]);

  const filteredSkills = useMemo(() => {
    if (!skillSearch) return SKILL_OPTIONS;
    return SKILL_OPTIONS.filter(skill => 
      skill.toLowerCase().includes(skillSearch.toLowerCase())
    );
  }, [skillSearch]);

  // Handlers
  const handleLanguageToggle = (language) => {
    const newLanguages = filters.languages.includes(language)
      ? filters.languages.filter(l => l !== language)
      : [...filters.languages, language];
    setFilters({ ...filters, languages: newLanguages });
  };

  const handleSkillToggle = (skill) => {
    const newSkills = filters.skills.includes(skill)
      ? filters.skills.filter(s => s !== skill)
      : [...filters.skills, skill];
    setFilters({ ...filters, skills: newSkills });
  };

  // ===== NEW: Score Range Toggle =====
  const handleScoreRangeToggle = (range) => {
    const isSelected = filters.scoreRanges.some(r => r.min === range.min && r.max === range.max);
    const newRanges = isSelected
      ? filters.scoreRanges.filter(r => !(r.min === range.min && r.max === range.max))
      : [...filters.scoreRanges, { min: range.min, max: range.max }];
    setFilters({ ...filters, scoreRanges: newRanges });
  };

  // ===== NEW: Contribution Range Toggle =====
  const handleContributionRangeToggle = (range) => {
    const isSelected = filters.contributionRanges.some(r => r.min === range.min && r.max === range.max);
    const newRanges = isSelected
      ? filters.contributionRanges.filter(r => !(r.min === range.min && r.max === range.max))
      : [...filters.contributionRanges, { min: range.min, max: range.max }];
    setFilters({ ...filters, contributionRanges: newRanges });
  };

  // ===== NEW: Repo Range Toggle =====
  const handleRepoRangeToggle = (range) => {
    const isSelected = filters.repoRanges.some(r => r.min === range.min && r.max === range.max);
    const newRanges = isSelected
      ? filters.repoRanges.filter(r => !(r.min === range.min && r.max === range.max))
      : [...filters.repoRanges, { min: range.min, max: range.max }];
    setFilters({ ...filters, repoRanges: newRanges });
  };

  const handleReset = () => {
    setFilters({
      role: '',
      languages: [],
      skills: [],
      scoreRanges: [],
      contributionRanges: [],
      repoRanges: [],
      location: '',
    });
    setRoleSearch('');
    setLanguageSearch('');
    setSkillSearch('');
    
    if (onReset) {
      onReset();
    }
  };

  const handleApply = () => {
    onApplyFilters(filters);
  };

  const activeFilterCount = [
    filters.role,
    filters.languages.length > 0,
    filters.skills.length > 0,
    filters.scoreRanges.length > 0,
    filters.contributionRanges.length > 0,
    filters.repoRanges.length > 0,
    filters.location,
  ].filter(Boolean).length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={styles.headerLeft}>
          <h3 style={styles.title}>Advanced Filters</h3>
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
            <label style={styles.label}>
              Role {filters.role && <span style={styles.selectedBadge}>Selected: {filters.role}</span>}
            </label>
            <div style={styles.searchableDropdown}>
              <div style={styles.searchInputWrapper}>
                <Search size={16} color="#9ca3af" style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Type or select a role..."
                  value={roleSearch || filters.role}
                  onChange={(e) => {
                    setRoleSearch(e.target.value);
                    if (e.target.value !== filters.role) {
                      setFilters({ ...filters, role: '' });
                    }
                  }}
                  style={styles.input}
                  autoComplete="off"
                />
                {(roleSearch || filters.role) && (
                  <X 
                    size={16} 
                    color="#9ca3af" 
                    style={styles.clearIcon}
                    onClick={() => {
                      setRoleSearch('');
                      setFilters({ ...filters, role: '' });
                    }}
                  />
                )}
              </div>
              
              {roleSearch && roleSearch !== filters.role && filteredRoles.length > 0 && (
                <div style={styles.autocompleteDropdown}>
                  {filteredRoles.map(role => (
                    <div
                      key={role}
                      style={styles.autocompleteOption}
                      onClick={() => {
                        setFilters({ ...filters, role });
                        setRoleSearch('');
                      }}
                    >
                      {role}
                    </div>
                  ))}
                </div>
              )}
              
              {!roleSearch && !filters.role && (
                <div style={styles.roleChips}>
                  {ROLE_OPTIONS.map(role => (
                    <button
                      key={role}
                      onClick={() => setFilters({ ...filters, role })}
                      style={styles.roleChip}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              )}
              
              {roleSearch && filteredRoles.length === 0 && (
                <div style={styles.noResults}>No roles found</div>
              )}
            </div>
          </div>

          {/* Languages Filter */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>
              Programming Languages ({filters.languages.length} selected)
            </label>
            <div style={styles.searchableDropdown}>
              <div style={styles.searchInputWrapper}>
                <Search size={16} color="#9ca3af" style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search languages..."
                  value={languageSearch}
                  onChange={(e) => setLanguageSearch(e.target.value)}
                  style={styles.searchInput}
                />
                {languageSearch && (
                  <X 
                    size={16} 
                    color="#9ca3af" 
                    style={styles.clearIcon}
                    onClick={() => setLanguageSearch('')}
                  />
                )}
              </div>
              <div style={styles.checkboxGrid}>
                {filteredLanguages.map(language => (
                  <label key={language} style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={filters.languages.includes(language)}
                      onChange={() => handleLanguageToggle(language)}
                      style={styles.checkbox}
                    />
                    <span style={styles.checkboxText}>{language}</span>
                  </label>
                ))}
              </div>
              {languageSearch && filteredLanguages.length === 0 && (
                <div style={styles.noResults}>No languages found</div>
              )}
            </div>
          </div>

          {/* Skills & Frameworks Filter */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>
              Skills & Frameworks ({filters.skills.length} selected)
            </label>
            <div style={styles.searchableDropdown}>
              <div style={styles.searchInputWrapper}>
                <Search size={16} color="#9ca3af" style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  style={styles.searchInput}
                />
                {skillSearch && (
                  <X 
                    size={16} 
                    color="#9ca3af" 
                    style={styles.clearIcon}
                    onClick={() => setSkillSearch('')}
                  />
                )}
              </div>
              <div style={styles.checkboxGrid}>
                {filteredSkills.map(skill => (
                  <label key={skill} style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={filters.skills.includes(skill)}
                      onChange={() => handleSkillToggle(skill)}
                      style={styles.checkbox}
                    />
                    <span style={styles.checkboxText}>{skill}</span>
                  </label>
                ))}
              </div>
              {skillSearch && filteredSkills.length === 0 && (
                <div style={styles.noResults}>No skills found</div>
              )}
            </div>
          </div>

          {/* Location */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>Location</label>
            <input
              type="text"
              placeholder="e.g., San Francisco, Remote"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              style={styles.input}
            />
          </div>

          {/* ===== NEW: Developer Score Ranges (Multi-Select) ===== */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>
              Developer Score ({filters.scoreRanges.length} range{filters.scoreRanges.length !== 1 ? 's' : ''} selected)
            </label>
            <div style={styles.rangeCheckboxContainer}>
              {SCORE_RANGES.map(range => {
                const isSelected = filters.scoreRanges.some(r => r.min === range.min && r.max === range.max);
                return (
                  <label 
                    key={range.label} 
                    style={{
                      ...styles.rangeCheckboxLabel,
                      ...(isSelected ? styles.rangeCheckboxLabelSelected : {})
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleScoreRangeToggle(range)}
                      style={styles.rangeCheckbox}
                    />
                    <div style={styles.rangeCheckboxContent}>
                      <span style={{
                        ...styles.rangeColorDot,
                        backgroundColor: range.color
                      }}></span>
                      <span style={styles.rangeCheckboxText}>{range.label}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ===== NEW: Contribution Ranges (Multi-Select) ===== */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>
              Minimum Contributions ({filters.contributionRanges.length} range{filters.contributionRanges.length !== 1 ? 's' : ''} selected)
            </label>
            <div style={styles.rangeCheckboxContainer}>
              {CONTRIBUTION_RANGES.map(range => {
                const isSelected = filters.contributionRanges.some(r => r.min === range.min && r.max === range.max);
                return (
                  <label 
                    key={range.label} 
                    style={{
                      ...styles.rangeCheckboxLabel,
                      ...(isSelected ? styles.rangeCheckboxLabelSelected : {})
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleContributionRangeToggle(range)}
                      style={styles.rangeCheckbox}
                    />
                    <span style={styles.rangeCheckboxText}>{range.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ===== NEW: Repo Ranges (Multi-Select) - LAST ===== */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>
              Minimum Repositories ({filters.repoRanges.length} range{filters.repoRanges.length !== 1 ? 's' : ''} selected)
            </label>
            <div style={styles.rangeCheckboxContainer}>
              {REPO_RANGES.map(range => {
                const isSelected = filters.repoRanges.some(r => r.min === range.min && r.max === range.max);
                return (
                  <label 
                    key={range.label} 
                    style={{
                      ...styles.rangeCheckboxLabel,
                      ...(isSelected ? styles.rangeCheckboxLabelSelected : {})
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleRepoRangeToggle(range)}
                      style={styles.rangeCheckbox}
                    />
                    <span style={styles.rangeCheckboxText}>{range.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button onClick={handleReset} style={styles.resetButton}>
              Reset All
            </button>
            <button onClick={handleApply} style={styles.applyButton}>
              Apply Filters
            </button>
          </div>
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
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  searchableDropdown: {
    position: 'relative',
  },
  searchInputWrapper: {
    position: 'relative',
    marginBottom: '12px',
  },
  searchInput: {
    width: '100%',
    padding: '10px 36px 10px 36px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'Outfit, sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  clearIcon: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'Outfit, sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
    maxHeight: '200px',
    overflowY: 'auto',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  checkboxText: {
    fontSize: '14px',
    color: '#374151',
  },
  noResults: {
    padding: '12px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  resetButton: {
    flex: 1,
    padding: '12px 24px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'Outfit, sans-serif',
  },
  applyButton: {
    flex: 1,
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#FF6B35',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'Outfit, sans-serif',
  },
  selectedBadge: {
    marginLeft: '8px',
    padding: '4px 10px',
    backgroundColor: '#FF6B35',
    color: '#ffffff',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
  },
  autocompleteDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: 10,
    maxHeight: '200px',
    overflowY: 'auto',
  },
  autocompleteOption: {
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    transition: 'background 0.2s',
    borderBottom: '1px solid #f3f4f6',
  },
  roleChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px',
  },
  roleChip: {
    padding: '8px 14px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'Outfit, sans-serif',
  },

  // ===== NEW: Range Checkbox Styles =====
  rangeCheckboxContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },

  rangeCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  rangeCheckboxLabelSelected: {
    backgroundColor: '#fff5f2',
    borderColor: '#FF6B35',
    boxShadow: '0 0 0 3px rgba(255, 107, 53, 0.1)',
  },

  rangeCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    flexShrink: 0,
  },

  rangeCheckboxContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
  },

  rangeColorDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  },

  rangeCheckboxText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
};

export default FilterPanel;