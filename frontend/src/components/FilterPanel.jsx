import React, { useState, useRef } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

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
  { value: 'US_DIVIDER', label: '── 🇺🇸 United States ──', disabled: true },
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

  // === INDIA ===
  { value: 'INDIA_DIVIDER', label: '── 🇮🇳 India ──', disabled: true },
  { value: 'Bangalore', label: 'Bangalore' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Hyderabad', label: 'Hyderabad' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Pune', label: 'Pune' },
  { value: 'Chennai', label: 'Chennai' },
  { value: 'Gurgaon', label: 'Gurgaon' },
  { value: 'Noida', label: 'Noida' },
  { value: 'Kolkata', label: 'Kolkata' },

  // === EUROPE ===
  { value: 'EUROPE_DIVIDER', label: '── 🇪🇺 Europe ──', disabled: true },
  { value: 'London', label: '🇬🇧 London' },
  { value: 'Berlin', label: '🇩🇪 Berlin' },
  { value: 'Amsterdam', label: '🇳🇱 Amsterdam' },
  { value: 'Paris', label: '🇫🇷 Paris' },
  { value: 'Dublin', label: '🇮🇪 Dublin' },
  { value: 'Zurich', label: '🇨🇭 Zurich' },
  { value: 'Munich', label: '🇩🇪 Munich' },
  { value: 'Stockholm', label: '🇸🇪 Stockholm' },
  { value: 'Barcelona', label: '🇪🇸 Barcelona' },
  { value: 'Copenhagen', label: '🇩🇰 Copenhagen' },
  { value: 'Vienna', label: '🇦🇹 Vienna' },
  { value: 'Milan', label: '🇮🇹 Milan' },
  { value: 'Madrid', label: '🇪🇸 Madrid' },
  { value: 'Lisbon', label: '🇵🇹 Lisbon' },
  { value: 'Prague', label: '🇨🇿 Prague' },
  { value: 'Warsaw', label: '🇵🇱 Warsaw' },

  // === MIDDLE EAST ===
  { value: 'ME_DIVIDER', label: '── 🌍 Middle East ──', disabled: true },
  { value: 'Dubai', label: '🇦🇪 Dubai' },
  { value: 'Tel Aviv', label: '🇮🇱 Tel Aviv' },
  { value: 'Abu Dhabi', label: '🇦🇪 Abu Dhabi' },
  { value: 'Riyadh', label: '🇸🇦 Riyadh' },
  { value: 'Doha', label: '🇶🇦 Doha' },

  // === ASIA ===
  { value: 'ASIA_DIVIDER', label: '── 🌏 Asia ──', disabled: true },
  { value: 'Singapore', label: '🇸🇬 Singapore' },
  { value: 'Tokyo', label: '🇯🇵 Tokyo' },
  { value: 'Hong Kong', label: '🇭🇰 Hong Kong' },
  { value: 'Seoul', label: '🇰🇷 Seoul' },
  { value: 'Shanghai', label: '🇨🇳 Shanghai' },
  { value: 'Beijing', label: '🇨🇳 Beijing' },
  { value: 'Taipei', label: '🇹🇼 Taipei' },
  { value: 'Bangkok', label: '🇹🇭 Bangkok' },
  { value: 'Kuala Lumpur', label: '🇲🇾 Kuala Lumpur' },

  // === AUSTRALIA ===
  { value: 'AUS_DIVIDER', label: '── 🇦🇺 Australia & NZ ──', disabled: true },
  { value: 'Sydney', label: '🇦🇺 Sydney' },
  { value: 'Melbourne', label: '🇦🇺 Melbourne' },
  { value: 'Brisbane', label: '🇦🇺 Brisbane' },
  { value: 'Auckland', label: '🇳🇿 Auckland' },
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
    minScore: initialFilters.minScore || 0,
    hasEmail: initialFilters.hasEmail || false,
    minExperience: initialFilters.minExperience || 0,
  });
  const [activeSpecLabel, setActiveSpecLabel] = useState(null);
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const [jdText, setJdText] = useState('');
  const [jdFilename, setJdFilename] = useState('');
  const [isParsingJd, setIsParsingJd] = useState(false);
  const [jdFileLoading, setJdFileLoading] = useState(false);
  const [jdError, setJdError] = useState('');
  const [jdSuccess, setJdSuccess] = useState('');
  const jdFileRef = useRef(null);

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
    setFilters({ role: '', location: '', languages: [], minScore: 0, hasEmail: false, minExperience: 0 });
    setActiveSpecLabel(null);
    setShowAllLanguages(false);
    setJdText('');
    setJdFilename('');
    setJdSuccess('');
    setJdError('');
    if (onReset) {
      onReset();
    }
  };

  const handleJdFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJdFileLoading(true);
    setJdError('');
    setJdSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch(`${API_BASE_URL}/api/extract-jd-file`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await resp.json();
      if (data.success) {
        setJdText(data.text);
        setJdFilename(data.filename);
        setJdError('');
      } else {
        setJdError(data.detail || 'Could not extract text from file.');
      }
    } catch {
      setJdError('Failed to upload file. Please try again.');
    } finally {
      setJdFileLoading(false);
      if (jdFileRef.current) jdFileRef.current.value = '';
    }
  };

  const handleJdSearch = async () => {
    if (!jdText || jdText.length < 50) {
      setJdError('Please enter at least 50 characters');
      return;
    }

    setIsParsingJd(true);
    setJdError('');
    setJdSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/parse-job-description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ job_description: jdText }),
      });

      const data = await response.json();

      if (data.success && data.filters) {
        const parts = [];
        if (data.filters.role) parts.push(`Role: ${data.filters.role}`);
        if (data.filters.location) parts.push(`Location: ${data.filters.location}`);
        if (data.filters.languages?.length) parts.push(`Skills: ${data.filters.languages.join(', ')}`);

        setJdSuccess(`Extracted: ${parts.join(' • ')}`);

        // Role + location are the primary search drivers from a JD.
        // Languages are intentionally excluded here — the role filter already
        // handles language matching internally, and passing extra languages
        // would make results too narrow. Experience is also skipped (not measurable).
        const newFilters = {
          role: data.filters.role || '',
          location: data.filters.location || '',
          languages: [],
          minScore: filters.minScore || 0,
          hasEmail: filters.hasEmail || false,
          minExperience: 0,
        };
        setFilters(newFilters);

        onApplyFilters({
          role: newFilters.role || null,
          location: newFilters.location || null,
          languages: null,
          minScore: newFilters.minScore,
          hasEmail: newFilters.hasEmail,
          minExperience: 0,
        });
        // JD content intentionally kept — cleared only on Reset
      } else {
        setJdError(data.message || data.detail || 'Could not parse job description. Please try again.');
      }
    } catch (error) {
      console.error('JD parse error:', error);
      setJdError('Failed to parse job description. Please try again.');
    } finally {
      setIsParsingJd(false);
    }
  };

  const handleApply = () => {
    onApplyFilters({
      role: filters.role || null,
      location: filters.location || null,
      languages: filters.languages.length > 0 ? filters.languages : null,
      minScore: filters.minScore || 0,
      hasEmail: filters.hasEmail || false,
      minExperience: filters.minExperience || 0,
    });
  };

  const activeFilterCount = [
    filters.role,
    filters.location,
    filters.languages.length > 0,
    filters.minScore > 0,
    filters.hasEmail,
    filters.minExperience > 0,
  ].filter(Boolean).length;

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
        <p style={styles.subtitle}>Find developers across 150,000+ profiles globally</p>
      </div>

      {/* Card Body */}
      <div style={styles.cardBody}>
        {/* AI Job Description Search */}
        <div style={styles.jdSection}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '18px' }}>🤖</span>
            <h3 style={styles.jdTitle}>AI-Powered JD Search</h3>
            <span style={styles.jdBadge}>NEW</span>
          </div>
          <p style={styles.jdSubtitle}>
            Paste your job description and let AI find matching candidates instantly
          </p>
          <textarea
            value={jdText}
            onChange={(e) => {
              setJdText(e.target.value);
              setJdFilename('');
              setJdError('');
              setJdSuccess('');
            }}
            placeholder={`Paste your job description here... (minimum 50 characters)\n\nExample: Looking for a Senior Backend Developer with 5+ years experience in Python and Go. Must have experience with microservices, REST APIs, and cloud platforms like AWS or GCP. Remote-friendly, based in Bangalore preferred.`}
            style={styles.jdTextarea}
          />

          {/* File upload row */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ flex: 1, height: '1px', background: '#ddd6fe' }} />
              <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 500 }}>OR UPLOAD FILE</span>
              <div style={{ flex: 1, height: '1px', background: '#ddd6fe' }} />
            </div>
            {jdFilename ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: '12px', color: '#15803d', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jdFilename}</span>
                <button type="button" onClick={() => { setJdText(''); setJdFilename(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>
              </div>
            ) : (
              <div
                onClick={() => !jdFileLoading && jdFileRef.current?.click()}
                style={{ border: '1.5px dashed #c4b5fd', borderRadius: '8px', padding: '10px', textAlign: 'center', cursor: jdFileLoading ? 'wait' : 'pointer', background: 'rgba(255,255,255,0.6)', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#7c3aed'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#c4b5fd'}
              >
                {jdFileLoading ? (
                  <span style={{ fontSize: '12px', color: '#7c3aed' }}>Extracting text...</span>
                ) : (
                  <span style={{ fontSize: '12px', color: '#7c3aed' }}>
                    📎 Upload <strong>.pdf</strong>, <strong>.docx</strong>, or <strong>.txt</strong>
                  </span>
                )}
              </div>
            )}
            <input ref={jdFileRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display: 'none' }} onChange={handleJdFileUpload} />
          </div>

          {jdError && (
            <div style={styles.jdErrorBox}>
              <span>⚠️</span>
              <p style={{ margin: 0, fontSize: '12px', color: '#dc2626' }}>{jdError}</p>
            </div>
          )}

          {jdSuccess && (
            <div style={styles.jdSuccessBox}>
              <span>✅</span>
              <p style={{ margin: 0, fontSize: '12px', color: '#16a34a' }}>{jdSuccess}</p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#a78bfa' }}>
              {jdText.length}/50 characters minimum
            </p>
            <button
              onClick={handleJdSearch}
              disabled={isParsingJd || jdText.length < 50}
              style={isParsingJd || jdText.length < 50 ? styles.jdBtnDisabled : styles.jdBtn}
            >
              {isParsingJd ? (
                <>⏳ &nbsp;Analyzing JD...</>
              ) : (
                <>✨ &nbsp;Find Candidates</>
              )}
            </button>
          </div>

          {/* Searching Tech Talent banner */}
          {isParsingJd && (
            <div style={styles.searchingBanner}>
              <style>{`
                @keyframes fp-spin { to { transform: rotate(360deg); } }
                @keyframes fp-pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
                .fp-spinner { animation: fp-spin 0.8s linear infinite; }
                .fp-pulse { animation: fp-pulse 1.4s ease-in-out infinite; }
              `}</style>
              <div className="fp-spinner" style={styles.searchingSpinner} />
              <div>
                <p className="fp-pulse" style={styles.searchingTitle}>Searching Tech Talent</p>
                <p style={styles.searchingSubtitle}>AI is scanning 150,000+ developer profiles...</p>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={styles.jdDivider}>
          <div style={styles.jdDividerLine} />
          <span style={styles.jdDividerText}>or customize filters</span>
          <div style={styles.jdDividerLine} />
        </div>

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
            <select
              value={filters.location}
              onChange={(e) => {
                const opt = LOCATION_OPTIONS.find(o => o.value === e.target.value);
                if (!opt?.disabled) setFilters({ ...filters, location: e.target.value });
              }}
              style={styles.select}
            >
              {LOCATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Score, Experience, Email filters — second row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={styles.fieldLabel}>Min Score</label>
            <select
              value={filters.minScore}
              onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
              style={styles.select}
            >
              <option value={0}>Any Score</option>
              <option value={30}>30+ (Junior+)</option>
              <option value={50}>50+ (Mid-Level+)</option>
              <option value={70}>70+ (Senior+)</option>
              <option value={85}>85+ (Expert)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={styles.fieldLabel}>Experience</label>
            <select
              value={filters.minExperience}
              onChange={(e) => setFilters({ ...filters, minExperience: parseInt(e.target.value) })}
              style={styles.select}
            >
              <option value={0}>Any Experience</option>
              <option value={1}>1+ years</option>
              <option value={3}>3+ years</option>
              <option value={5}>5+ years</option>
              <option value={8}>8+ years</option>
              <option value={10}>10+ years</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={styles.fieldLabel}>Contact</label>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '10px',
              backgroundColor: filters.hasEmail ? '#FFF3ED' : '#fafafa',
              cursor: 'pointer', fontSize: '14px', color: '#1f2937',
              transition: 'all 0.2s',
            }}>
              <input
                type="checkbox"
                checked={filters.hasEmail}
                onChange={(e) => setFilters({ ...filters, hasEmail: e.target.checked })}
                style={{ accentColor: '#FF6B35', width: '16px', height: '16px' }}
              />
              Has email only
            </label>
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
  jdSection: {
    padding: '20px',
    background: 'linear-gradient(135deg, #faf5ff 0%, #eef2ff 100%)',
    borderRadius: '14px',
    border: '1px solid #e9d5ff',
    marginBottom: '0',
  },
  jdTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 700,
    color: '#6b21a8',
  },
  jdBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#7e22ce',
    backgroundColor: '#e9d5ff',
    padding: '2px 8px',
    borderRadius: '100px',
  },
  jdSubtitle: {
    margin: '0 0 12px',
    fontSize: '12px',
    color: '#7c3aed',
  },
  jdTextarea: {
    width: '100%',
    height: '112px',
    padding: '12px',
    fontSize: '13px',
    fontFamily: 'Outfit, system-ui, sans-serif',
    border: '1px solid #ddd6fe',
    borderRadius: '10px',
    resize: 'none',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#374151',
    boxSizing: 'border-box',
    lineHeight: '1.5',
  },
  jdErrorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
  },
  jdSuccessBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
  },
  jdBtn: {
    padding: '11px 22px',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'Outfit, system-ui, sans-serif',
    color: '#ffffff',
    background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 4px 14px rgba(124,58,237,0.45)',
    letterSpacing: '0.01em',
  },
  jdBtnDisabled: {
    padding: '11px 22px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'Outfit, system-ui, sans-serif',
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '10px',
    cursor: 'not-allowed',
    letterSpacing: '0.01em',
  },
  searchingBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginTop: '14px',
    padding: '14px 18px',
    background: 'linear-gradient(135deg, #4c1d95 0%, #3730a3 100%)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(76,29,149,0.4)',
  },
  searchingSpinner: {
    width: '22px',
    height: '22px',
    border: '3px solid rgba(255,255,255,0.25)',
    borderTop: '3px solid #ffffff',
    borderRadius: '50%',
    flexShrink: 0,
  },
  searchingTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '0.01em',
  },
  searchingSubtitle: {
    margin: '3px 0 0',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.75)',
  },
  jdDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '24px 0',
  },
  jdDividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e5e7eb',
  },
  jdDividerText: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#9ca3af',
    whiteSpace: 'nowrap',
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
    padding: '13px 24px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'Outfit, system-ui, sans-serif',
    color: '#ffffff',
    background: 'linear-gradient(135deg, #FF6B35 0%, #ea4d0b 100%)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 4px 14px rgba(255,107,53,0.45)',
    letterSpacing: '0.01em',
  },
};

export default FilterPanel;
