import React from 'react';
import { X, Star, GitBranch, Code, MapPin, Mail, Calendar, ExternalLink, Award, TrendingUp } from 'lucide-react';

const ProfileDetailModal = ({ profile, isOpen, onClose }) => {
  if (!isOpen || !profile) return null;

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

  const scoreColor = getScoreColor(profile.developer_score || 0);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <img 
              src={profile.avatar_url || 'https://via.placeholder.com/80'} 
              alt={profile.name || profile.github_username}
              style={styles.avatar}
            />
            <div>
              <h2 style={styles.name}>{profile.name || profile.github_username}</h2>
              <a 
                href={'https://github.com/' + profile.github_username}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.username}
              >
                <span>@{profile.github_username}</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
          
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        <div style={{...styles.scoreBanner, background: scoreColor}}>
          <Award size={24} color="#fff" />
          <div>
            <div style={styles.scoreValue}>Developer Score: {profile.developer_score || 0}/100</div>
            <div style={styles.scoreLabel}>{getScoreLabel(profile.developer_score || 0)}</div>
          </div>
        </div>

        <div style={styles.content}>
          {profile.bio && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>About</h3>
              <p style={styles.bio}>{profile.bio}</p>
            </div>
          )}

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Contact Information</h3>
            <div style={styles.infoGrid}>
              {profile.email && (
                <div style={styles.infoItem}>
                  <Mail size={18} color="#6b7280" />
                  <a href={'mailto:' + profile.email} style={styles.infoLink}>
                    {profile.email}
                  </a>
                </div>
              )}
              {profile.location && (
                <div style={styles.infoItem}>
                  <MapPin size={18} color="#6b7280" />
                  <span style={styles.infoText}>{profile.location}</span>
                </div>
              )}
              {profile.created_at && (
                <div style={styles.infoItem}>
                  <Calendar size={18} color="#6b7280" />
                  <span style={styles.infoText}>
                    Joined {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>GitHub Statistics</h3>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <Star size={24} color="#f59e0b" />
                <div style={styles.statValue}>{(profile.total_stars || 0).toLocaleString()}</div>
                <div style={styles.statLabel}>Total Stars</div>
              </div>
              <div style={styles.statCard}>
                <GitBranch size={24} color="#3b82f6" />
                <div style={styles.statValue}>{profile.public_repos || 0}</div>
                <div style={styles.statLabel}>Public Repos</div>
              </div>
              <div style={styles.statCard}>
                <Code size={24} color="#8b5cf6" />
                <div style={styles.statValue}>{(profile.contributions_last_year || 0).toLocaleString()}</div>
                <div style={styles.statLabel}>Contributions</div>
              </div>
              <div style={styles.statCard}>
                <TrendingUp size={24} color="#10b981" />
                <div style={styles.statValue}>{profile.followers || 0}</div>
                <div style={styles.statLabel}>Followers</div>
              </div>
            </div>
          </div>

          {profile.languages_data && Object.keys(profile.languages_data).length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Programming Languages</h3>
              <div style={styles.languagesGrid}>
                {Object.entries(profile.languages_data)
                  .sort((a, b) => b[1] - a[1])
                  .map(([lang, percent]) => (
                    <div key={lang} style={styles.languageItem}>
                      <div style={styles.languageHeader}>
                        <span style={styles.languageName}>{lang}</span>
                        <span style={styles.languagePercent}>{percent}%</span>
                      </div>
                      <div style={styles.languageBar}>
                        <div style={{...styles.languageBarFill, width: percent + '%'}}></div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {profile.top_repos && profile.top_repos.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Top Repositories</h3>
              <div style={styles.reposGrid}>
                {profile.top_repos.slice(0, 3).map((repo, index) => (
                  <a 
                    key={index}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.repoCard}
                  >
                    <div style={styles.repoName}>
                      <span>{repo.name}</span>
                      <ExternalLink size={14} />
                    </div>
                    {repo.description && (
                      <div style={styles.repoDesc}>{repo.description}</div>
                    )}
                    <div style={styles.repoStats}>
                      <span style={styles.repoStat}>
                        <Star size={14} color="#f59e0b" />
                        <span>{repo.stars}</span>
                      </span>
                      {repo.language && (
                        <span style={styles.repoStat}>
                          <Code size={14} color="#6b7280" />
                          <span>{repo.language}</span>
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <a
            href={'https://github.com/' + profile.github_username}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.githubBtn}
          >
            <ExternalLink size={18} />
            <span>View Full GitHub Profile</span>
          </a>
          {profile.email && (
            <a href={'mailto:' + profile.email} style={styles.emailBtn}>
              <Mail size={18} />
              <span>Send Email</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '2rem',
  },

  modal: {
    background: '#fff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '2rem 2rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },

  headerLeft: {
    display: 'flex',
    gap: '1.25rem',
    alignItems: 'center',
    flex: 1,
  },

  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #f3f4f6',
  },

  name: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: '0 0 0.5rem 0',
  },

  username: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    color: '#4f46e5',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: '500',
  },

  closeBtn: {
    background: '#f9fafb',
    border: 'none',
    borderRadius: '8px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#6b7280',
    transition: 'all 0.2s',
  },

  scoreBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem 2rem',
    color: '#fff',
  },

  scoreValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '0.25rem',
  },

  scoreLabel: {
    fontSize: '0.875rem',
    opacity: 0.9,
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '2rem',
  },

  section: {
    marginBottom: '2rem',
  },

  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1rem',
  },

  bio: {
    fontSize: '1rem',
    color: '#4b5563',
    lineHeight: '1.7',
    margin: 0,
  },

  infoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },

  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },

  infoText: {
    fontSize: '0.9375rem',
    color: '#4b5563',
  },

  infoLink: {
    fontSize: '0.9375rem',
    color: '#4f46e5',
    textDecoration: 'none',
    fontWeight: '500',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '1rem',
  },

  statCard: {
    background: '#f9fafb',
    padding: '1.25rem',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #e5e7eb',
  },

  statValue: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: '0.75rem 0 0.25rem',
  },

  statLabel: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    fontWeight: '500',
  },

  languagesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },

  languageItem: {
    width: '100%',
  },

  languageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
  },

  languageName: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  languagePercent: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '600',
  },

  languageBar: {
    height: '8px',
    background: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },

  languageBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  },

  reposGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },

  repoCard: {
    padding: '1.25rem',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },

  repoName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },

  repoDesc: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '0.75rem',
    lineHeight: '1.6',
  },

  repoStats: {
    display: 'flex',
    gap: '1.5rem',
  },

  repoStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.875rem',
    color: '#6b7280',
  },

  footer: {
    display: 'flex',
    gap: '1rem',
    padding: '1.5rem 2rem',
    borderTop: '1px solid #e5e7eb',
    background: '#f9fafb',
  },

  githubBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.875rem',
    background: '#1a1a1a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },

  emailBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.875rem',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
};

export default ProfileDetailModal;