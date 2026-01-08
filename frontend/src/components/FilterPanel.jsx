import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Search } from 'lucide-react';

// ===== CONSTANTS =====
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
  'JavaScript', 'Python', 'Java', 'TypeScript', 'C++', 'C#', 'Go', 'Rust',
  'Swift', 'Kotlin', 'Ruby', 'PHP', 'Scala', 'R', 'Dart', 'Perl', 'Haskell',
  'Lua', 'Elixir', 'Clojure'
];

// ✅ SPLIT: Frameworks vs Tools
const FRAMEWORK_OPTIONS = [
  'React', 'Vue.js', 'Angular', 'Next.js', 'Svelte', 'Django', 'Flask',
  'FastAPI', 'Spring Boot', 'Express.js', 'Laravel', 'Rails', 'ASP.NET',
  'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy'
];

const TOOL_OPTIONS = [
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'Ansible',
  'Jenkins', 'GitLab CI', 'GitHub Actions', 'MongoDB', 'PostgreSQL', 'MySQL',
  'Redis', 'Elasticsearch', 'GraphQL', 'REST API', 'Git', 'Jira', 'Figma'
];

// ✅ UPDATED: Cleaner location options with consistent structure
// Grouped by: Countries → Cities → Regions → Remote
const LOCATION_OPTIONS = [
  // North America - United States
  { value: 'United States', label: '🇺🇸 United States', category: 'country' },
  { value: 'San Francisco', label: '  📍 San Francisco, CA', category: 'city' },
  { value: 'New York', label: '  📍 New York, NY', category: 'city' },
  { value: 'Seattle', label: '  📍 Seattle, WA', category: 'city' },
  { value: 'Austin', label: '  📍 Austin, TX', category: 'city' },
  
  // Europe
  { value: 'Europe', label: '🌍 Europe', category: 'region' },
  { value: 'United Kingdom', label: '  🇬🇧 United Kingdom', category: 'country' },
  { value: 'London', label: '    📍 London', category: 'city' },
  { value: 'Germany', label: '  🇩🇪 Germany', category: 'country' },
  { value: 'Berlin', label: '    📍 Berlin', category: 'city' },
  { value: 'Netherlands', label: '  🇳🇱 Netherlands', category: 'country' },
  { value: 'Amsterdam', label: '    📍 Amsterdam', category: 'city' },
  
  // Asia - India
  { value: 'Asia', label: '🌏 Asia', category: 'region' },
  { value: 'India', label: '  🇮🇳 India', category: 'country' },
  { value: 'Bangalore', label: '    📍 Bangalore', category: 'city' },
  { value: 'Mumbai', label: '    📍 Mumbai', category: 'city' },
  { value: 'Delhi', label: '    📍 Delhi', category: 'city' },
  
  // Asia - Other
  { value: 'Singapore', label: '  🇸🇬 Singapore', category: 'city' },
  { value: 'Japan', label: '  🇯🇵 Japan', category: 'country' },
  { value: 'Tokyo', label: '    📍 Tokyo', category: 'city' },
  
  // Remote
  { value: 'Remote', label: '🌐 Remote / Anywhere', category: 'remote' }
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
  { label: '0-5 (New)', min: 0, max: 5 },
  { label: '5-10 (Some Activity)', min: 5, max: 10 },
  { label: '10-20 (Regular)', min: 10, max: 20 },
  { label: '20-50 (Active)', min: 20, max: 50 },
  { label: '50+ (Very Active)', min: 50, max: 999999 }
];

const FilterPanel = ({ onApplyFilters, initialFilters = {}, onReset }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filters, setFilters] = useState({
    role: initialFilters.role || '',
    languages: initialFilters.languages || [],
    frameworks: initialFilters.frameworks || [],
    tools: initialFilters.tools || [],
    contributionRanges: initialFilters.contributionRanges || [],
    repoRanges: initialFilters.repoRanges || [],
    location: initialFilters.location || '',
  });

  // Search states
  const [roleSearch, setRoleSearch] = useState('');
  const [languageSearch, setLanguageSearch] = useState('');
  const [frameworkSearch, setFrameworkSearch] = useState('');
  const [toolSearch, setToolSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');

  // Dropdown visibility
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showFrameworkDropdown, setShowFrameworkDropdown] = useState(false);
  const [showToolDropdown, setShowToolDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

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
      div[style*="dropdownOption"]:hover {
        background: #f3f4f6 !important;
      }
    `;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
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

  const filteredFrameworks = useMemo(() => {
    if (!frameworkSearch) return FRAMEWORK_OPTIONS;
    return FRAMEWORK_OPTIONS.filter(fw => 
      fw.toLowerCase().includes(frameworkSearch.toLowerCase())
    );
  }, [frameworkSearch]);

  const filteredTools = useMemo(() => {
    if (!toolSearch) return TOOL_OPTIONS;
    return TOOL_OPTIONS.filter(tool => 
      tool.toLowerCase().includes(toolSearch.toLowerCase())
    );
  }, [toolSearch]);

  const filteredLocations = useMemo(() => {
    if (!locationSearch) return LOCATION_OPTIONS;
    return LOCATION_OPTIONS.filter(loc => 
      loc.label.toLowerCase().includes(locationSearch.toLowerCase()) ||
      loc.value.toLowerCase().includes(locationSearch.toLowerCase())
    );
  }, [locationSearch]);

  // Handlers
  const handleLanguageToggle = (language) => {
    const newLanguages = filters.languages.includes(language)
      ? filters.languages.filter(l => l !== language)
      : [...filters.languages, language];
    setFilters({ ...filters, languages: newLanguages });
  };

  const handleFrameworkToggle = (framework) => {
    const newFrameworks = filters.frameworks.includes(framework)
      ? filters.frameworks.filter(f => f !== framework)
      : [...filters.frameworks, framework];
    setFilters({ ...filters, frameworks: newFrameworks });
  };

  const handleToolToggle = (tool) => {
    const newTools = filters.tools.includes(tool)
      ? filters.tools.filter(t => t !== tool)
      : [...filters.tools, tool];
    setFilters({ ...filters, tools: newTools });
  };

  const handleContributionRangeToggle = (range) => {
    const isSelected = filters.contributionRanges.some(r => r.min === range.min && r.max === range.max);
    const newRanges = isSelected
      ? filters.contributionRanges.filter(r => !(r.min === range.min && r.max === range.max))
      : [...filters.contributionRanges, { min: range.min, max: range.max }];
    setFilters({ ...filters, contributionRanges: newRanges });
  };

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
      frameworks: [],
      tools: [],
      contributionRanges: [],
      repoRanges: [],
      location: '',
    });
    setRoleSearch('');
    setLanguageSearch('');
    setFrameworkSearch('');
    setToolSearch('');
    setLocationSearch('');
    
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
    filters.frameworks.length > 0,
    filters.tools.length > 0,
    filters.contributionRanges.length > 0,
    filters.repoRanges.length > 0,
    filters.location,
  ].filter(Boolean).length;

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
            </div>
          </div>

          {/* ✅ Programming Languages - Dropdown with Dynamic Arrow */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>
              Programming Languages ({filters.languages.length} selected)
            </label>
            <div style={styles.dropdownContainer}>
              <div style={styles.dropdownToggle} onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}>
                <span style={styles.dropdownToggleText}>
                  {filters.languages.length === 0
                    ? 'Select languages...'
                    : filters.languages.slice(0, 3).join(', ') + (filters.languages.length > 3 ? ` +${filters.languages.length - 3} more` : '')}
                </span>
                {showLanguageDropdown ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
              </div>

              {showLanguageDropdown && (
                <div style={styles.dropdownMenu}>
                  <div style={styles.searchInputWrapper}>
                    <Search size={16} color="#9ca3af" style={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="Search languages..."
                      value={languageSearch}
                      onChange={(e) => setLanguageSearch(e.target.value)}
                      style={styles.searchInput}
                      autoComplete="off"
                    />
                  </div>
                  <div style={styles.dropdownOptions}>
                    {filteredLanguages.map(lang => (
                      <div
                        key={lang}
                        style={styles.dropdownOption}
                        onClick={() => handleLanguageToggle(lang)}
                      >
                        <input
                          type="checkbox"
                          checked={filters.languages.includes(lang)}
                          readOnly
                          style={styles.checkbox}
                        />
                        <span>{lang}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Frameworks - Dropdown with Dynamic Arrow */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>
              Frameworks ({filters.frameworks.length} selected)
            </label>
            <div style={styles.dropdownContainer}>
              <div style={styles.dropdownToggle} onClick={() => setShowFrameworkDropdown(!showFrameworkDropdown)}>
                <span style={styles.dropdownToggleText}>
                  {filters.frameworks.length === 0
                    ? 'Select frameworks...'
                    : filters.frameworks.slice(0, 3).join(', ') + (filters.frameworks.length > 3 ? ` +${filters.frameworks.length - 3} more` : '')}
                </span>
                {showFrameworkDropdown ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
              </div>

              {showFrameworkDropdown && (
                <div style={styles.dropdownMenu}>
                  <div style={styles.searchInputWrapper}>
                    <Search size={16} color="#9ca3af" style={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="Search frameworks..."
                      value={frameworkSearch}
                      onChange={(e) => setFrameworkSearch(e.target.value)}
                      style={styles.searchInput}
                      autoComplete="off"
                    />
                  </div>
                  <div style={styles.dropdownOptions}>
                    {filteredFrameworks.map(fw => (
                      <div
                        key={fw}
                        style={styles.dropdownOption}
                        onClick={() => handleFrameworkToggle(fw)}
                      >
                        <input
                          type="checkbox"
                          checked={filters.frameworks.includes(fw)}
                          readOnly
                          style={styles.checkbox}
                        />
                        <span>{fw}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Tools - Dropdown with Dynamic Arrow */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>
              Tools ({filters.tools.length} selected)
            </label>
            <div style={styles.dropdownContainer}>
              <div style={styles.dropdownToggle} onClick={() => setShowToolDropdown(!showToolDropdown)}>
                <span style={styles.dropdownToggleText}>
                  {filters.tools.length === 0
                    ? 'Select tools...'
                    : filters.tools.slice(0, 3).join(', ') + (filters.tools.length > 3 ? ` +${filters.tools.length - 3} more` : '')}
                </span>
                {showToolDropdown ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
              </div>

              {showToolDropdown && (
                <div style={styles.dropdownMenu}>
                  <div style={styles.searchInputWrapper}>
                    <Search size={16} color="#9ca3af" style={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="Search tools..."
                      value={toolSearch}
                      onChange={(e) => setToolSearch(e.target.value)}
                      style={styles.searchInput}
                      autoComplete="off"
                    />
                  </div>
                  <div style={styles.dropdownOptions}>
                    {filteredTools.map(tool => (
                      <div
                        key={tool}
                        style={styles.dropdownOption}
                        onClick={() => handleToolToggle(tool)}
                      >
                        <input
                          type="checkbox"
                          checked={filters.tools.includes(tool)}
                          readOnly
                          style={styles.checkbox}
                        />
                        <span>{tool}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Location - Dropdown with free-text input + predefined options */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>
              Location
            </label>
            <div style={styles.dropdownContainer}>
              <div style={styles.dropdownToggle} onClick={() => setShowLocationDropdown(!showLocationDropdown)}>
                <input
                  type="text"
                  placeholder="Type or select location..."
                  value={filters.location}
                  onChange={(e) => {
                    setFilters({ ...filters, location: e.target.value });
                    setLocationSearch(e.target.value);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLocationDropdown(true);
                  }}
                  style={styles.locationInput}
                  autoComplete="off"
                />
                {showLocationDropdown ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
              </div>

              {showLocationDropdown && (
                <div style={styles.dropdownMenu}>
                  <div style={styles.dropdownOptions}>
                    {filteredLocations.map(loc => (
                      <div
                        key={loc.value}
                        style={styles.dropdownOption}
                        onClick={() => {
                          setFilters({ ...filters, location: loc.value });
                          setLocationSearch('');
                          setShowLocationDropdown(false);
                        }}
                      >
                        <span>{loc.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contribution Ranges */}
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

          {/* Repo Ranges */}
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
  
  // ✅ NEW: Dropdown styles
  dropdownContainer: {
    position: 'relative',
  },
  dropdownToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  dropdownToggleText: {
    fontSize: '14px',
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  dropdownMenu: {
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
    maxHeight: '300px',
    overflowY: 'auto',
  },
  dropdownOptions: {
    padding: '4px',
  },
  dropdownOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    borderRadius: '6px',
    transition: 'background 0.2s',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  locationInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    fontFamily: 'Outfit, sans-serif',
    color: '#374151',
  },
  hintText: {
    display: 'block',
    marginTop: '6px',
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  
  // Range checkboxes
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
  rangeCheckboxText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  
  // Actions
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
};

export default FilterPanel;