import React from 'react';
import { Star, MapPin, Lock, Unlock } from 'lucide-react';

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

const LanguageTags = ({ languagesData }) => {
  if (!languagesData || Object.keys(languagesData).length === 0) return null;

  const languagesObj = typeof languagesData === 'string'
    ? JSON.parse(languagesData)
    : languagesData;

  const total = Object.values(languagesObj).reduce((a, b) => a + b, 0);

  return (
    <div style={styles.languages}>
      {Object.entries(languagesObj)
        .map(([lang, bytes]) => [lang, ((bytes / total) * 100).toFixed(1)])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([lang, percent]) => (
          <span key={lang} style={styles.languageTag}>
            {lang} ({percent}%)
          </span>
        ))}
    </div>
  );
};

const ProfileCard = ({ profile, onSelect, onViewDetails, onToggleSave, isSaved, isUnlocked }) => {
  const prevUnlockedRef = React.useRef(isUnlocked);
  const [justUnlocked, setJustUnlocked] = React.useState(false);

  React.useEffect(() => {
    if (isUnlocked && !prevUnlockedRef.current) {
      setJustUnlocked(true);
      const timer = setTimeout(() => setJustUnlocked(false), 500);
      return () => clearTimeout(timer);
    }
    prevUnlockedRef.current = isUnlocked;
  }, [isUnlocked]);

  const displayName = getDisplayName(profile, isUnlocked);

  const handleUnlockClick = () => {
    onViewDetails && onViewDetails(profile);
  };

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
          {profile.location && (
            <div style={styles.location}>
              <MapPin size={14} />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.estimated_experience_years && profile.estimated_experience_years > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6b7280', fontSize: '0.875rem' }}>
              <span>~{profile.estimated_experience_years} years active</span>
            </div>
          )}
        </div>
        <div style={{
          ...styles.scoreBadge,
          backgroundColor: getScoreColor(profile.developer_score)
        }}>
          <div style={styles.scoreValue}>{profile.developer_score}</div>
          <div style={styles.scoreLabel}>{getScoreLabel(profile.developer_score)}</div>
        </div>
      </div>

      {/* Bio - truncated to 50 chars */}
      {profile.bio && (
        <p style={styles.bio}>
          {profile.bio.length > 50 ? profile.bio.substring(0, 50) + '...' : profile.bio}
        </p>
      )}

      {/* Languages - Top 2 only */}
      <LanguageTags languagesData={profile.languages_data} />

      {/* Actions - Unlock Profile + Save */}
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
            ...styles.starActionButton,
            backgroundColor: isSaved ? '#FFB800' : '#f3f4f6'
          }}
        >
          <Star
            size={18}
            color={isSaved ? '#ffffff' : '#6b7280'}
            fill={isSaved ? '#ffffff' : 'none'}
            strokeWidth={2}
          />
          <span style={{ color: isSaved ? '#ffffff' : '#6b7280' }}>
            {isSaved ? 'Saved' : 'Save'}
          </span>
        </button>
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#fafbfc',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s',
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
    boxShadow: '0 2px 8px rgba(255, 107, 53, 0.25)',
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
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 10,
  },

  header: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
    position: 'relative',
  },

  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #f3f4f6',
  },

  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },

  name: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: 0,
    lineHeight: 1.3,
  },

  location: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    color: '#6b7280',
    fontSize: '0.875rem',
  },

  scoreBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    borderRadius: '8px',
    minWidth: '70px',
    height: '70px',
    color: '#fff',
  },

  scoreValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    lineHeight: 1,
  },

  scoreLabel: {
    fontSize: '0.6875rem',
    opacity: 0.9,
    marginTop: '0.25rem',
  },

  bio: {
    color: '#4b5563',
    fontSize: '0.875rem',
    lineHeight: '1.5',
    marginBottom: '1rem',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },

  languages: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginBottom: '1rem',
  },

  languageTag: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#e0e7ff',
    color: '#4f46e5',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },

  actions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },

  viewButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1rem',
    backgroundColor: '#FF6B35',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontFamily: 'Outfit, sans-serif',
  },

  viewButtonUnlocked: {
    backgroundColor: '#10b981',
  },

  starActionButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'Outfit, sans-serif',
  },
};

// Hover effects + unlock animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  div[style*="checkboxContainer"]:hover {
    border-color: #FF6B35 !important;
    box-shadow: 0 4px 8px rgba(255, 107, 53, 0.2) !important;
  }

  button[style*="starButton"]:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
  }

  @keyframes unlockPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.08); }
    100% { transform: scale(1); }
  }

  .unlock-profile-btn.just-unlocked {
    animation: unlockPulse 0.4s ease-out;
  }

  .unlock-profile-btn:hover {
    transform: translateY(-1px);
    filter: brightness(0.9);
  }

  button[style*="starActionButton"]:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
  }

  div[style*="card"]:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
    transform: translateY(-2px);
  }
`;
document.head.appendChild(styleSheet);

export default ProfileCard;
