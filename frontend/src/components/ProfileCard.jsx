import React from 'react';
import { Star, GitBranch, MapPin, Mail, ExternalLink, Code } from 'lucide-react';

const ProfileCard = ({ profile, onToggleSelect }) => {
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

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <img
          src={profile.avatar_url || 'https://via.placeholder.com/80'}
          alt={profile.name || profile.github_username}
          style={styles.avatar}
        />
        <div style={styles.info}>
          <h3 style={styles.name}>{profile.name || profile.github_username}</h3>
          <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noopener noreferrer" style={styles.username}>
            @{profile.github_username} <ExternalLink size={14} />
          </a>
          {profile.location && (
            <div style={styles.location}>
              <MapPin size={14} />
              <span>{profile.location}</span>
            </div>
          )}
        </div>
        <div style={{...styles.scoreBadge, backgroundColor: getScoreColor(profile.developer_score)}}>
          <div style={styles.scoreValue}>{profile.developer_score}</div>
          <div style={styles.scoreLabel}>{getScoreLabel(profile.developer_score)}</div>
        </div>
      </div>
      {profile.bio && <p style={styles.bio}>{profile.bio}</p>}
      <div style={styles.stats}>
        <div style={styles.stat}>
          <Star size={16} color="#f59e0b" />
          <span>{profile.total_stars.toLocaleString()} stars</span>
        </div>
        <div style={styles.stat}>
          <GitBranch size={16} color="#3b82f6" />
          <span>{profile.public_repos} repos</span>
        </div>
        <div style={styles.stat}>
          <Code size={16} color="#8b5cf6" />
          <span>{profile.contributions_last_year} contributions</span>
        </div>
      </div>
      {profile.languages_data && (
        <div style={styles.languages}>
          {Object.entries(profile.languages_data).slice(0, 3).map(([lang, percent]) => (
            <span key={lang} style={styles.languageTag}>{lang} ({percent}%)</span>
          ))}
        </div>
      )}
      <div style={styles.actions}>
        <button onClick={() => onToggleSelect(profile.id)} style={{...styles.selectButton, backgroundColor: profile.selected ? '#10b981' : '#6b7280'}}>
          {profile.selected ? '✓ Selected' : 'Select for Email'}
        </button>
        {profile.email && (
          <a href={`mailto:${profile.email}`} style={styles.emailLink}>
            <Mail size={16} />
            <span>Email</span>
          </a>
        )}
      </div>
    </div>
  );
};

const styles = {
  card: { backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', transition: 'transform 0.2s, box-shadow 0.2s' },
  header: { display: 'flex', gap: '1rem', marginBottom: '1rem', position: 'relative' },
  avatar: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' },
  info: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  name: { fontSize: '1.25rem', fontWeight: 'bold', color: '#1a1a2e', margin: 0 },
  username: { display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#4f46e5', textDecoration: 'none', fontSize: '0.875rem' },
  location: { display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6b7280', fontSize: '0.875rem' },
  scoreBadge: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '8px', minWidth: '80px', color: '#fff' },
  scoreValue: { fontSize: '1.5rem', fontWeight: 'bold' },
  scoreLabel: { fontSize: '0.75rem', opacity: 0.9 },
  bio: { color: '#4b5563', fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '1rem' },
  stats: { display: 'flex', gap: '1.5rem', marginBottom: '1rem' },
  stat: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#4b5563' },
  languages: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' },
  languageTag: { padding: '0.25rem 0.75rem', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '500' },
  actions: { display: 'flex', gap: '0.5rem' },
  selectButton: { flex: 1, padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' },
  emailLink: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', color: '#1f2937', textDecoration: 'none', borderRadius: '4px', fontSize: '0.875rem', fontWeight: '500' },
};

export default ProfileCard;