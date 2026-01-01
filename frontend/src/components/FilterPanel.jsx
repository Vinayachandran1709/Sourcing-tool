import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Search } from 'lucide-react';

// ===== CONSTANT DEFINITIONS (MUST BE OUTSIDE COMPONENT) =====
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

// ===== COMPONENT STARTS HERE =====
const FilterPanel = ({ onApplyFilters, initialFilters = {}, onReset }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filters, setFilters] = useState({
    role: initialFilters.role || '',
    languages: initialFilters.languages || [],
    skills: initialFilters.skills || [],
    minRepos: initialFilters.minRepos || 0,
    minContributions: initialFilters.minContributions || 0,
    location: initialFilters.location || '',
  });

  // Search states for each dropdown
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
      
      button[style*="resetButton"]:hover {
        background: #f9fafb !important;
      }
      
      button[style*="applyButton"]:hover {
        background: #e85a26 !important;
      }
    `;
    document.head.appendChild(styleSheet);

    // Cleanup function to remove the style when component unmounts
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // Filtered options based on search
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

  const handleRoleChange = (e) => {
    setFilters({ ...filters, role: e.target.value });
  };

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

  const handleReset = () => {
    setFilters({
      role: '',
      languages: [],
      skills: [],
      minRepos: 0,
      minContributions: 0,
      location: '',
    });
    setRoleSearch('');
    setLanguageSearch('');
    setSkillSearch('');
    
    // Call parent's reset handler
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
    filters.minRepos > 0,
    filters.minContributions > 0,
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
          {/* Role Filter - Single Input with Autocomplete */}
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
                    // Clear selection when typing
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
              
              {/* Autocomplete Suggestions */}
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
              
              {/* Role Chips */}
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
                <div style={styles.noResults}>No roles found - try selecting from chips below</div>
              )}
            </div>
          </div>

          {/* Languages Filter with Search */}
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

          {/* Skills & Frameworks Filter with Search */}
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

        {/* Min Repos (Soft Filter) */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>
              Minimum Repositories (optional boost)
            </label>
            <input
              type="number"
              placeholder="0"
              value={filters.minRepos}
              onChange={(e) => setFilters({ ...filters, minRepos: parseInt(e.target.value) || 0 })}
              style={styles.input}
            />
            <span style={styles.filterHint}>
              Profiles with fewer repos will still appear, just ranked lower
            </span>
          </div>

          {/* Min Contributions - Dropdown with Presets */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>
              Minimum Contributions (optional boost)
            </label>
            <div style={styles.dropdownWrapper}>
              <select
                value={filters.minContributions}
                onChange={(e) => setFilters({ ...filters, minContributions: parseInt(e.target.value) })}
                style={styles.select}
              >
                <option value="0">Any (No minimum)</option>
                <option value="10">10+ contributions (Active hobbyist)</option>
                <option value="50">50+ contributions (Regular contributor)</option>
                <option value="100">100+ contributions (Very active)</option>
                <option value="250">250+ contributions (Highly active)</option>
                <option value="500">500+ contributions (Elite contributor)</option>
              </select>
              <span style={styles.filterHint}>
                Profiles with fewer contributions will still appear, ranked lower
              </span>
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

// ===== STYLES (OUTSIDE COMPONENT) =====
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
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'Outfit, sans-serif',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s',
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
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    outline: 'none',
    WebkitAppearance: 'none',
    background: '#e5e7eb',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
    fontSize: '12px',
    color: '#6b7280',
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
  filterHint: {
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '4px',
    fontStyle: 'italic',
  },
  dropdownWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
};

export default FilterPanel;