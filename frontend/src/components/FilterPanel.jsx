import React, { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

const FilterPanel = ({ onApplyFilters, initialFilters = {} }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filters, setFilters] = useState({
    location: initialFilters.location || '',
    role: initialFilters.role || '',
    languages: initialFilters.languages || [],
    skills: initialFilters.skills || [],
    min_repos: initialFilters.min_repos || 5,
    min_followers: initialFilters.min_followers || 0,
    min_score: initialFilters.min_score || 0,
    min_contributions: initialFilters.min_contributions || 0,
  });

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
};

const styles = {
  panel: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    marginBottom: '2rem',
    overflow: 'hidden',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background 0.2s',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },

  title: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
  },

  toggleBtn: {
    background: 'transparent',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
  },

  content: {
    padding: '1.5rem',
  },

  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1.5rem',
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },

  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
  },

  input: {
    padding: '0.75rem',
    fontSize: '0.9375rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: "'Outfit', sans-serif",
    transition: 'border-color 0.2s',
  },

  select: {
    padding: '0.75rem',
    fontSize: '0.9375rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: "'Outfit', sans-serif",
    background: '#fff',
    cursor: 'pointer',
  },

  section: {
    marginBottom: '1.5rem',
  },

  sectionLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.75rem',
    display: 'block',
  },

  chipGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },

  chip: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: "'Outfit', sans-serif",
  },

  chipActive: {
    background: '#fff5f2',
    borderColor: '#FF6B35',
    color: '#FF6B35',
  },

  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #f3f4f6',
  },

  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    fontSize: '0.9375rem',
    fontWeight: '600',
    background: '#fff',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },

  applyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    fontSize: '0.9375rem',
    fontWeight: '600',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
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