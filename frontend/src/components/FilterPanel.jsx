import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, X, Search } from 'lucide-react';

const FilterPanel = ({ onApplyFilters, initialFilters = {} }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filters, setFilters] = useState({
    role: initialFilters.role || '',
    languages: initialFilters.languages || [],
    skills: initialFilters.skills || [],
    minScore: initialFilters.minScore || 0,
    minFollowers: initialFilters.minFollowers || 0,
    minRepos: initialFilters.minRepos || 0,
    minContributions: initialFilters.minContributions || 0,
    location: initialFilters.location || '',
  });

  // NEW: Search states for each dropdown
  const [roleSearch, setRoleSearch] = useState('');
  const [languageSearch, setLanguageSearch] = useState('');
  const [skillSearch, setSkillSearch] = useState('');

  // NEW: Filtered options based on search
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
      minScore: 0,
      minFollowers: 0,
      minRepos: 0,
      minContributions: 0,
      location: '',
    });
    setRoleSearch('');
    setLanguageSearch('');
    setSkillSearch('');
  };

  const handleApply = () => {
    onApplyFilters(filters);
  };

  const activeFilterCount = [
    filters.role,
    filters.languages.length > 0,
    filters.skills.length > 0,
    filters.minScore > 0,
    filters.minFollowers > 0,
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
          {/* Role Filter with Search */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>Role</label>
            <div style={styles.searchableDropdown}>
              <div style={styles.searchInputWrapper}>
                <Search size={16} color="#9ca3af" style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  style={styles.searchInput}
                />
                {roleSearch && (
                  <X 
                    size={16} 
                    color="#9ca3af" 
                    style={styles.clearIcon}
                    onClick={() => setRoleSearch('')}
                  />
                )}
              </div>
              <select
                value={filters.role}
                onChange={handleRoleChange}
                style={styles.select}
              >
                <option value="">All Roles</option>
                {filteredRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              {roleSearch && filteredRoles.length === 0 && (
                <div style={styles.noResults}>No roles found</div>
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

          {/* Developer Score */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>
              Minimum Developer Score: {filters.minScore}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.minScore}
              onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
              style={styles.slider}
            />
            <div style={styles.sliderLabels}>
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* Min Followers */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>Minimum Followers</label>
            <input
              type="number"
              placeholder="0"
              value={filters.minFollowers}
              onChange={(e) => setFilters({ ...filters, minFollowers: parseInt(e.target.value) || 0 })}
              style={styles.input}
            />
          </div>

          {/* Min Repos */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>Minimum Public Repositories</label>
            <input
              type="number"
              placeholder="0"
              value={filters.minRepos}
              onChange={(e) => setFilters({ ...filters, minRepos: parseInt(e.target.value) || 0 })}
              style={styles.input}
            />
          </div>

          {/* Min Contributions */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>Minimum Contributions</label>
            <input
              type="number"
              placeholder="0"
              value={filters.minContributions}
              onChange={(e) => setFilters({ ...filters, minContributions: parseInt(e.target.value) || 0 })}
              style={styles.input}
            />
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

  const roles = [
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'DevOps Engineer',
    'Data Scientist',
    'ML Engineer',
    'Mobile Developer (iOS)',
    'Mobile Developer (Android)',
    'QA Engineer',
    'SRE',
    'Security Engineer',
    'Game Developer',
    'Blockchain Developer',
    'AR/VR Developer',
    'Embedded Systems',
    'Cloud Architect',
  ];

  const popularLanguages = [
    'JavaScript', 'Python', 'Java', 'TypeScript', 'C++',
    'C#', 'PHP', 'Ruby', 'Go', 'Rust',
    'Swift', 'Kotlin', 'R', 'Scala', 'Dart'
  ];

  const popularSkills = [
    'React', 'Node.js', 'Django', 'Flask', 'Spring Boot',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
    'TensorFlow', 'PyTorch', 'MongoDB', 'PostgreSQL', 'Redis',
    'GraphQL', 'REST API', 'CI/CD', 'Git', 'Linux'
  ];

  const handleChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field, value) => {
    setFilters(prev => {
      const currentArray = prev[field];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [field]: newArray };
    });
  };

  const handleApply = () => {
    onApplyFilters(filters);
  };

  const handleReset = () => {
    const resetFilters = {
      location: '',
      role: '',
      languages: [],
      skills: [],
      min_repos: 5,
      min_followers: 0,
      min_score: 0,
      min_contributions: 0,
    };
    setFilters(resetFilters);
    onApplyFilters(resetFilters);
  };

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={styles.headerLeft}>
          <Filter size={20} color="#FF6B35" />
          <h3 style={styles.title}>Advanced Filters</h3>
        </div>
        <button style={styles.toggleBtn}>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div style={styles.content}>
          {/* Basic Filters Row */}
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Location</label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g., Bangalore, India"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Role</label>
              <select
                value={filters.role}
                onChange={(e) => handleChange('role', e.target.value)}
                style={styles.select}
              >
                <option value="">All Roles</option>
                {roles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Languages */}
          <div style={styles.section}>
            <label style={styles.sectionLabel}>
              Programming Languages ({filters.languages.length} selected)
            </label>
            <div style={styles.chipGrid}>
              {popularLanguages.map(lang => (
                <button
                  key={lang}
                  onClick={() => handleArrayToggle('languages', lang)}
                  style={{
                    ...styles.chip,
                    ...(filters.languages.includes(lang) ? styles.chipActive : {})
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div style={styles.section}>
            <label style={styles.sectionLabel}>
              Skills & Frameworks ({filters.skills.length} selected)
            </label>
            <div style={styles.chipGrid}>
              {popularSkills.map(skill => (
                <button
                  key={skill}
                  onClick={() => handleArrayToggle('skills', skill)}
                  style={{
                    ...styles.chip,
                    ...(filters.skills.includes(skill) ? styles.chipActive : {})
                  }}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* Numeric Filters */}
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Min Repositories</label>
              <input
                type="number"
                value={filters.min_repos}
                onChange={(e) => handleChange('min_repos', parseInt(e.target.value) || 0)}
                min="0"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Min Followers</label>
              <input
                type="number"
                value={filters.min_followers}
                onChange={(e) => handleChange('min_followers', parseInt(e.target.value) || 0)}
                min="0"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Min Developer Score (0-100)</label>
              <input
                type="number"
                value={filters.min_score}
                onChange={(e) => handleChange('min_score', parseInt(e.target.value) || 0)}
                min="0"
                max="100"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Min Contributions (Last Year)</label>
              <input
                type="number"
                value={filters.min_contributions}
                onChange={(e) => handleChange('min_contributions', parseInt(e.target.value) || 0)}
                min="0"
                style={styles.input}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.actions}>
            <button onClick={handleReset} style={styles.resetBtn}>
              <X size={18} />
              <span>Reset Filters</span>
            </button>
            <button onClick={handleApply} style={styles.applyBtn}>
              <Filter size={18} />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

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
  // NEW: Searchable dropdown styles
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
};

// Hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  input:focus, select:focus {
    outline: none;
    border-color: #FF6B35 !important;
  }
  
  button[style*="chip"]:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  button[style*="resetBtn"]:hover {
    border-color: #FF6B35 !important;
    color: #FF6B35 !important;
  }
  
  button[style*="applyBtn"]:hover {
    background: #ff5722 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255,107,53,0.3);
  }
  
  div[style*="header"]:hover {
    background: #fafafa !important;
  }
`;
document.head.appendChild(styleSheet);

export default FilterPanel;