import React, { useState } from 'react';
import { Star, MapPin, Lock, Unlock, Code, Users, Flame, Briefcase, Sparkles } from 'lucide-react';

const getScoreColor = (score) => {
  if (score >= 85) return '#10b981';
  if (score >= 70) return '#3b82f6';
  if (score >= 50) return '#f59e0b';
  return '#6b7280';
};

const getScoreLabel = (score) => {
  if (score >= 85) return 'Expert';
  if (score >= 70) return 'Senior';
  if (score >= 50) return 'Mid-Level';
  if (score >= 30) return 'Junior';
  return 'Beginner';
};

const getDisplayName = (profile, isUnlocked) => {
  if (!profile.name) return profile.github_username;
  if (isUnlocked) return profile.name;
  return profile.name.trim().split(/\s+/)[0];
};

const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const LanguageTags = ({ languages, languagesData }) => {
  let displayLanguages = [];

  if (languages && languages.length > 0) {
    displayLanguages = languages.slice(0, 4);
  } else if (languagesData && Object.keys(languagesData).length > 0) {
    const languagesObj = typeof languagesData === 'string'
      ? JSON.parse(languagesData)
      : languagesData;
    displayLanguages = Object.keys(languagesObj).slice(0, 4);
  }

  if (displayLanguages.length === 0) return null;

  const colors = {
    'Python': { bg: '#3776ab20', text: '#3776ab' },
    'JavaScript': { bg: '#f7df1e20', text: '#b8a900' },
    'TypeScript': { bg: '#3178c620', text: '#3178c6' },
    'Java': { bg: '#ed8b0020', text: '#ed8b00' },
    'Go': { bg: '#00add820', text: '#00add8' },
    'Rust': { bg: '#ce422b20', text: '#ce422b' },
    'C++': { bg: '#00599c20', text: '#00599c' },
    'Ruby': { bg: '#cc342d20', text: '#cc342d' },
    'Swift': { bg: '#fa734320', text: '#fa7343' },
    'Kotlin': { bg: '#7f52ff20', text: '#7f52ff' },
    'PHP': { bg: '#777bb420', text: '#777bb4' },
    'C#': { bg: '#68217a20', text: '#68217a' },
    'Scala': { bg: '#dc322f20', text: '#dc322f' },
    'R': { bg: '#276dc320', text: '#276dc3' },
    'default': { bg: '#e0e7ff', text: '#4f46e5' }
  };

  return (
    <div style={styles.languages}>
      {displayLanguages.map((lang) => {
        const color = colors[lang] || colors['default'];
        return (
          <span
            key={lang}
            style={{
              ...styles.languageTag,
              backgroundColor: color.bg,
              color: color.text,
            }}
          >
            {lang}
          </span>
        );
      })}
    </div>
  );
};

const StatItem = ({ icon: Icon, value, label, color = '#6b7280' }) => (
  <div style={styles.statItem}>
    <Icon size={14} color={color} />
    <span style={styles.statValue}>{value}</span>
    <span style={styles.statLabel}>{label}</span>
  </div>
);

const ProfileCard = ({
  profile,
  onSelect,
  onViewDetails,
  onToggleSave,
  isSaved,
  isUnlocked,
  aiSummary = null,
  onRequestSummary = null,
  isLoadingSummary = false
}) => {
  const prevUnlockedRef = React.useRef(isUnlocked);
  const [justUnlocked, setJustUnlocked] = React.useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [localAiSummary, setLocalAiSummary] = useState(aiSummary);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  React.useEffect(() => {
    if (isUnlocked && !prevUnlockedRef.current) {
      setJustUnlocked(true);
      const timer = setTimeout(() => setJustUnlocked(false), 500);
      return () => clearTimeout(timer);
    }
    prevUnlockedRef.current = isUnlocked;
  }, [isUnlocked]);

  const displayName = getDisplayName(profile, isUnlocked);
  const primaryRole = profile.detected_role || profile.detected_roles?.[0] || 'Developer';
  const allRoles = profile.detected_roles || [];

  const handleUnlockClick = () => {
    onViewDetails && onViewDetails(profile);
  };

  const handleGenerateSummary = async () => {
    if (localAiSummary || isGeneratingSummary) return;

    setIsGeneratingSummary(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/generate-profile-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ profile }),
      });

      const data = await response.json();
      if (data.success && data.summary) {
        setLocalAiSummary(data.summary);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const displaySummary = localAiSummary || aiSummary;

  return (
    <div style={styles.card}>
      {/* Select Checkbox (Top-Left) */}
      {onSelect && (
        <div
          style={{
            ...styles.checkboxContainer,
            background: profile.selected ? '#FF6B35' : '#FFF7F3',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(profile.id);
          }}
        >
          <input
            type="checkbox"
            checked={profile.selected || false}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(profile.id);
            }}
            style={styles.checkbox}
          />
          <span style={{
            ...styles.checkboxLabel,
            color: profile.selected ? '#fff' : '#FF6B35',
          }}>
            {profile.selected ? 'Selected' : 'Select'}
          </span>
        </div>
      )}

      {/* Star Button (Top-Right) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSave && onToggleSave(profile);
        }}
        style={styles.starButton}
        title={isSaved ? 'Remove from saved' : 'Save profile'}
      >
        <Star
          size={22}
          color={isSaved ? '#FFB800' : '#d1d5db'}
          fill={isSaved ? '#FFB800' : 'none'}
          strokeWidth={isSaved ? 0 : 2}
        />
      </button>

      {/* Header with Avatar & Score */}
      <div style={styles.header}>
        <img
          src={profile.avatar_url || 'https://via.placeholder.com/80'}
          alt={displayName}
          style={styles.avatar}
        />
        <div style={styles.info}>
          <h3 style={styles.name}>{displayName}</h3>

          {/* Primary Role */}
          <div style={styles.roleContainer}>
            <Briefcase size={14} color="#6366f1" />
            <span style={styles.primaryRole}>{primaryRole}</span>
          </div>

          {/* Location */}
          {profile.location && (
            <div style={styles.location}>
              <MapPin size={14} color="#6b7280" />
              <span>{profile.location}</span>
            </div>
          )}

          {/* Experience */}
          {profile.estimated_experience_years && profile.estimated_experience_years > 0 && (
            <div style={styles.experience}>
              <span>⏱️ {profile.estimated_experience_years}+ years on GitHub</span>
            </div>
          )}
        </div>

        {/* Score Badge */}
        <div style={{
          ...styles.scoreBadge,
          backgroundColor: getScoreColor(profile.developer_score)
        }}>
          <div style={styles.scoreValue}>{profile.developer_score || 0}</div>
          <div style={styles.scoreLabel}>{getScoreLabel(profile.developer_score)}</div>
        </div>
      </div>

      {/* AI Summary Section */}
      {displaySummary ? (
        <div style={styles.aiSummaryContainer}>
          <div style={styles.aiSummaryHeader}>
            <Sparkles size={14} color="#8b5cf6" />
            <span style={styles.aiSummaryTitle}>AI Summary</span>
          </div>
          <p style={styles.aiSummaryText}>
            {showFullSummary || displaySummary.length <= 120
              ? displaySummary
              : displaySummary.substring(0, 120) + '...'}
          </p>
          {displaySummary.length > 120 && (
            <button
              onClick={() => setShowFullSummary(!showFullSummary)}
              style={styles.showMoreButton}
            >
              {showFullSummary ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      ) : (
        <div style={styles.aiSummaryPlaceholder}>
          <button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            style={styles.generateSummaryButton}
          >
            {isGeneratingSummary ? (
              <>
                <span style={styles.spinner}>⚙️</span>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Generate AI Summary</span>
              </>
            )}
          </button>
          {profile.bio && (
            <p style={styles.bio}>
              {profile.bio.length > 80 ? profile.bio.substring(0, 80) + '...' : profile.bio}
            </p>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div style={styles.statsRow}>
        <StatItem icon={Code} value={formatNumber(profile.public_repos)} label="repos" color="#3b82f6" />
        <StatItem icon={Star} value={formatNumber(profile.total_stars)} label="stars" color="#f59e0b" />
        <StatItem icon={Users} value={formatNumber(profile.followers)} label="followers" color="#8b5cf6" />
        <StatItem icon={Flame} value={formatNumber(profile.contributions_last_year)} label="commits" color="#10b981" />
      </div>

      {/* Languages */}
      <LanguageTags languages={profile.languages} languagesData={profile.languages_data} />

      {/* Secondary Roles (if any) */}
      {allRoles.length > 1 && (
        <div style={styles.secondaryRoles}>
          {allRoles.slice(1, 3).map((role, idx) => (
            <span key={idx} style={styles.secondaryRoleTag}>
              {role}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button
          onClick={handleUnlockClick}
          style={{
            ...styles.viewButton,
            ...(isUnlocked ? styles.viewButtonUnlocked : {})
          }}
          className={`unlock-profile-btn${justUnlocked ? ' just-unlocked' : ''}`}
        >
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'opacity 0.2s ease',
          }}>
            {isUnlocked ? (
              <>
                <Unlock size={16} />
                <span>View Profile</span>
              </>
            ) : (
              <>
                <Lock size={16} />
                <span>Unlock Profile</span>
              </>
            )}
          </span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave && onToggleSave(profile);
          }}
          style={{
            ...styles.saveButton,
            backgroundColor: isSaved ? '#FFB800' : '#f3f4f6',
            color: isSaved ? '#ffffff' : '#6b7280',
            borderColor: isSaved ? '#FFB800' : '#e5e7eb',
          }}
        >
          <Star
            size={16}
            color={isSaved ? '#ffffff' : '#6b7280'}
            fill={isSaved ? '#ffffff' : 'none'}
          />
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        </button>
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#ffffff',
    padding: '1.25rem',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    position: 'relative',
  },

  checkboxContainer: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    background: '#FFF7F3',
    border: '2px solid #FF6B35',
    borderRadius: '8px',
    padding: '4px 10px 4px 4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    boxShadow: '0 2px 8px rgba(255, 107, 53, 0.15)',
    zIndex: 10,
    cursor: 'pointer',
  },

  checkboxLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#FF6B35',
    userSelect: 'none',
    letterSpacing: '0.3px',
  },

  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#FF6B35',
  },

  starButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    zIndex: 10,
  },

  header: {
    display: 'flex',
    gap: '0.875rem',
    marginBottom: '0.875rem',
    marginTop: '0.5rem',
  },

  avatar: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #f3f4f6',
  },

  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    minWidth: 0,
  },

  name: {
    fontSize: '1.0625rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: 0,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  roleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },

  primaryRole: {
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: '#6366f1',
  },

  location: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    color: '#6b7280',
    fontSize: '0.8125rem',
  },

  experience: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },

  scoreBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    borderRadius: '12px',
    minWidth: '64px',
    height: '64px',
    color: '#fff',
    flexShrink: 0,
  },

  scoreValue: {
    fontSize: '1.375rem',
    fontWeight: '700',
    lineHeight: 1,
  },

  scoreLabel: {
    fontSize: '0.625rem',
    fontWeight: '600',
    opacity: 0.9,
    marginTop: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },

  aiSummaryContainer: {
    backgroundColor: '#f5f3ff',
    borderRadius: '10px',
    padding: '0.75rem',
    marginBottom: '0.75rem',
    border: '1px solid #e0e7ff',
  },

  aiSummaryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    marginBottom: '0.375rem',
  },

  aiSummaryTitle: {
    fontSize: '0.6875rem',
    fontWeight: '700',
    color: '#8b5cf6',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  aiSummaryText: {
    fontSize: '0.8125rem',
    color: '#4c1d95',
    lineHeight: 1.5,
    margin: 0,
  },

  showMoreButton: {
    background: 'none',
    border: 'none',
    color: '#7c3aed',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0.25rem 0',
    marginTop: '0.25rem',
  },

  aiSummaryPlaceholder: {
    marginBottom: '0.75rem',
  },

  generateSummaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.375rem',
    width: '100%',
    padding: '0.5rem 0.75rem',
    backgroundColor: '#f5f3ff',
    border: '1px dashed #c4b5fd',
    borderRadius: '8px',
    color: '#7c3aed',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '0.5rem',
  },

  spinner: {
    animation: 'spin 1s linear infinite',
  },

  bio: {
    color: '#4b5563',
    fontSize: '0.8125rem',
    lineHeight: '1.5',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },

  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: '10px',
    padding: '0.625rem 0.75rem',
    marginBottom: '0.75rem',
  },

  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },

  statValue: {
    fontSize: '0.8125rem',
    fontWeight: '700',
    color: '#1f2937',
  },

  statLabel: {
    fontSize: '0.6875rem',
    color: '#9ca3af',
  },

  languages: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
    marginBottom: '0.625rem',
  },

  languageTag: {
    padding: '0.25rem 0.625rem',
    borderRadius: '6px',
    fontSize: '0.6875rem',
    fontWeight: '600',
  },

  secondaryRoles: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
    marginBottom: '0.75rem',
  },

  secondaryRoleTag: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#f0fdf4',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '0.6875rem',
    fontWeight: '500',
  },

  actions: {
    display: 'flex',
    gap: '0.5rem',
  },

  viewButton: {
    flex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1rem',
    backgroundColor: '#FF6B35',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },

  viewButtonUnlocked: {
    backgroundColor: '#10b981',
  },

  saveButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.375rem',
    padding: '0.625rem 0.75rem',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '0.8125rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    backgroundColor: '#f3f4f6',
  },
};

// Hover effects and animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  div[style*="card"]:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
    transform: translateY(-2px);
    border-color: #d1d5db !important;
  }

  button[style*="starButton"]:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
  }

  @keyframes unlockPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  .unlock-profile-btn.just-unlocked {
    animation: unlockPulse 0.4s ease-out;
  }

  .unlock-profile-btn:hover {
    transform: translateY(-1px);
    filter: brightness(0.95);
  }
`;
document.head.appendChild(styleSheet);

export default ProfileCard;
