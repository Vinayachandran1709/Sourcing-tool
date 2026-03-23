import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Star, GitBranch, Code, MapPin, Mail, Calendar, ExternalLink,
  Award, Link as LinkIcon, Users, Clock, Globe
} from 'lucide-react';

const ProfileDetailModal = ({ profile, isOpen, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen && profile) {
      // Small delay to allow CSS transition to trigger
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
    }
  }, [isOpen, profile]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen || !profile) return null;

  const isVisible = visible;

  const getScoreColor = (score) => {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#6b7280';
  };

  const getScoreLabel = (score) => {
    if (score >= 85) return 'Expert Developer';
    if (score >= 70) return 'Senior Developer';
    if (score >= 50) return 'Mid-Level Developer';
    if (score >= 30) return 'Junior Developer';
    return 'Beginner';
  };

  const scoreColor = getScoreColor(profile.developer_score || 0);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Calculate activity recency
  const getActivityStatus = (lastActiveDate) => {
    if (!lastActiveDate) return null;  // ✅ CHANGED: Return null instead of "Unknown"
    
    const now = new Date();
    const lastActive = new Date(lastActiveDate);
    const daysDiff = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) return { text: 'Active this week', color: '#10b981' };
    if (daysDiff <= 30) return { text: 'Active this month', color: '#3b82f6' };
    if (daysDiff <= 90) return { text: 'Active recently', color: '#f59e0b' };
    return { text: 'Inactive', color: '#ef4444' };
  };

  const activityStatus = getActivityStatus(profile.last_active_date);

  const overlayAnimStyle = {
    ...styles.overlay,
    opacity: isVisible ? 1 : 0,
    transition: 'opacity 0.3s ease',
  };

  const modalAnimStyle = {
    ...styles.modal,
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.97)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
  };

  return (
    <div style={overlayAnimStyle} onClick={handleClose}>
      <div style={modalAnimStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <img
              src={profile.avatar_url || 'https://via.placeholder.com/100'}
              alt={profile.name || profile.github_username}
              style={styles.avatar}
            />
            <div style={styles.headerInfo}>
              <h2 style={styles.name}>{profile.name || profile.github_username}</h2>
              <a
                href={`https://github.com/${profile.github_username}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.username}
              >
                <span>@{profile.github_username}</span>
                <ExternalLink size={16} />
              </a>
              {profile.portfolio_url && (
                <a
                  href={profile.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.portfolioLink}
                >
                  <Globe size={14} />
                  <span>Portfolio</span>
                </a>
              )}
            </div>
          </div>

          <button onClick={handleClose} style={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        {/* Score Banner */}
        <div style={{...styles.scoreBanner, background: scoreColor}}>
          <Award size={28} color="#fff" />
          <div style={styles.scoreBannerText}>
            <div style={styles.scoreValue}>Developer Score: {profile.developer_score || 0}/100</div>
            <div style={styles.scoreLabel}>{getScoreLabel(profile.developer_score || 0)}</div>
          </div>
          {/* ✅ CHANGED: Only show activity badge if status exists */}
          {activityStatus && (
            <div style={styles.activityBadge}>
              <Clock size={16} />
              <span style={{color: activityStatus.color, fontWeight: 600}}>
                {activityStatus.text}
              </span>
            </div>
          )}
        </div>

        <div style={styles.content}>
          {/* Bio Section */}
          {profile.bio && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>About</h3>
              <p style={styles.bio}>{profile.bio}</p>
            </div>
          )}

          {/* Contact Information */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Contact Information</h3>
            <div style={styles.contactGrid}>
              {profile.email && (
                <div style={styles.contactItem}>
                  <div style={styles.contactIcon}>
                    <Mail size={18} color="#FF6B35" />
                  </div>
                  <div style={styles.contactDetails}>
                    <span style={styles.contactLabel}>Email</span>
                    <a href={`mailto:${profile.email}`} style={styles.contactValue}>
                      {profile.email}
                    </a>
                  </div>
                </div>
              )}
              
              {profile.location && (
                <div style={styles.contactItem}>
                  <div style={styles.contactIcon}>
                    <MapPin size={18} color="#3b82f6" />
                  </div>
                  <div style={styles.contactDetails}>
                    <span style={styles.contactLabel}>Location</span>
                    <span style={styles.contactValue}>{profile.location}</span>
                  </div>
                </div>
              )}

              {profile.portfolio_url && /^https?:\/\//i.test(profile.portfolio_url) && (
                <div style={styles.contactItem}>
                  <div style={styles.contactIcon}>
                    <LinkIcon size={18} color="#8b5cf6" />
                  </div>
                  <div style={styles.contactDetails}>
                    <span style={styles.contactLabel}>Website</span>
                    <a
                      href={profile.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.contactValue}
                    >
                      {profile.portfolio_url}
                    </a>
                  </div>
                </div>
              )}

              {profile.last_active_date && (
                <div style={styles.contactItem}>
                  <div style={styles.contactIcon}>
                    <Calendar size={18} color="#10b981" />
                  </div>
                  <div style={styles.contactDetails}>
                    <span style={styles.contactLabel}>Last Active</span>
                    <span style={styles.contactValue}>
                      {formatDate(profile.last_active_date)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* GitHub Statistics */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>GitHub Statistics</h3>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={{...styles.statIcon, background: '#fef3c7'}}>
                  <Star size={24} color="#f59e0b" />
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statValue}>
                    {(profile.total_stars || 0).toLocaleString()}
                  </div>
                  <div style={styles.statLabel}>Total Stars</div>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={{...styles.statIcon, background: '#dbeafe'}}>
                  <GitBranch size={24} color="#3b82f6" />
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statValue}>{profile.public_repos || 0}</div>
                  <div style={styles.statLabel}>Public Repos</div>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={{...styles.statIcon, background: '#f3e8ff'}}>
                  <Code size={24} color="#8b5cf6" />
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statValue}>
                    {(profile.contributions_last_year || 0).toLocaleString()}
                  </div>
                  <div style={styles.statLabel}>Contributions</div>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={{...styles.statIcon, background: '#d1fae5'}}>
                  <Users size={24} color="#10b981" />
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statValue}>{profile.followers || 0}</div>
                  <div style={styles.statLabel}>Followers</div>
                </div>
              </div>
            </div>
          </div>

          {/* Programming Languages */}
          {profile.languages_data && Object.keys(profile.languages_data).length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Programming Languages</h3>
              <div style={styles.languagesGrid}>
                {(() => {
                  const languagesObj = typeof profile.languages_data === 'string' 
                    ? JSON.parse(profile.languages_data) 
                    : profile.languages_data;
                  
                  const total = Object.values(languagesObj).reduce((a, b) => a + b, 0);
                  
                  return Object.entries(languagesObj)
                    .map(([lang, bytes]) => [lang, ((bytes / total) * 100).toFixed(1)])
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8) // Top 8 languages
                    .map(([lang, percent]) => (
                      <div key={lang} style={styles.languageItem}>
                        <div style={styles.languageHeader}>
                          <span style={styles.languageName}>{lang}</span>
                          <span style={styles.languagePercent}>{percent}%</span>
                        </div>
                        <div style={styles.languageBar}>
                          <div 
                            style={{
                              ...styles.languageBarFill, 
                              width: `${percent}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    ));
                })()}
              </div>
            </div>
          )}

          {/* Top Repositories */}
          {profile.top_repos && profile.top_repos.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Top Repositories</h3>
              <div style={styles.reposGrid}>
                {profile.top_repos.slice(0, 5).map((repo, index) => (
                  <a 
                    key={index}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.repoCard}
                  >
                    <div style={styles.repoHeader}>
                      <div style={styles.repoName}>
                        <GitBranch size={16} color="#6b7280" />
                        <span>{repo.name}</span>
                      </div>
                      <ExternalLink size={14} color="#9ca3af" />
                    </div>
                    
                    {repo.description && (
                      <div style={styles.repoDesc}>{repo.description}</div>
                    )}
                    
                    <div style={styles.repoFooter}>
                      <div style={styles.repoStats}>
                        <span style={styles.repoStat}>
                          <Star size={14} color="#f59e0b" />
                          <span>{repo.stars || 0}</span>
                        </span>
                        {repo.forks > 0 && (
                          <span style={styles.repoStat}>
                            <GitBranch size={14} color="#6b7280" />
                            <span>{repo.forks}</span>
                          </span>
                        )}
                      </div>
                      {repo.language && (
                        <span style={styles.repoLanguage}>
                          <Code size={14} />
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

        {/* Footer Actions */}
        <div style={styles.footer}>
          <a
            href={`https://github.com/${profile.github_username}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.githubBtn}
          >
            <ExternalLink size={18} />
            <span>View Full GitHub Profile</span>
          </a>
          {profile.email && (
            <a href={`mailto:${profile.email}`} style={styles.emailBtn}>
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
    maxWidth: '900px',
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
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '4px solid #f3f4f6',
  },

  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },

  name: {
    fontSize: '1.875rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: 0,
    lineHeight: 1.2,
  },

  username: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#4f46e5',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'color 0.2s',
  },

  portfolioLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'color 0.2s',
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
    justifyContent: 'space-between',
    gap: '1rem',
    padding: '1.5rem 2rem',
    color: '#fff',
  },

  scoreBannerText: {
    flex: 1,
  },

  scoreValue: {
    fontSize: '1.375rem',
    fontWeight: '700',
    marginBottom: '0.25rem',
  },

  scoreLabel: {
    fontSize: '0.9375rem',
    opacity: 0.9,
  },

  activityBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '8px',
    fontSize: '0.875rem',
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
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },

  bio: {
    fontSize: '1rem',
    color: '#4b5563',
    lineHeight: '1.7',
    margin: 0,
  },

  contactGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },

  contactItem: {
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
  },

  contactIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    flexShrink: 0,
  },

  contactDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    minWidth: 0,
  },

  contactLabel: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  contactValue: {
    fontSize: '0.9375rem',
    color: '#1a1a1a',
    fontWeight: '500',
    textDecoration: 'none',
    wordBreak: 'break-word',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '1rem',
  },

  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },

  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  statContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },

  statValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 1,
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
    height: '10px',
    background: '#e5e7eb',
    borderRadius: '5px',
    overflow: 'hidden',
  },

  languageBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FF6B35, #f59e0b)',
    borderRadius: '5px',
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

  repoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },

  repoName: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  repoDesc: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '1rem',
    lineHeight: '1.6',
  },

  repoFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  repoStats: {
    display: 'flex',
    gap: '1rem',
  },

  repoStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.875rem',
    color: '#6b7280',
  },

  repoLanguage: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.8125rem',
    color: '#6b7280',
    padding: '0.25rem 0.75rem',
    background: '#fff',
    borderRadius: '12px',
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

// Hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  button[style*="closeBtn"]:hover {
    background: #e5e7eb !important;
  }
  
  a[style*="username"]:hover {
    color: #3730a3 !important;
  }
  
  a[style*="portfolioLink"]:hover {
    color: #FF6B35 !important;
  }
  
  a[style*="repoCard"]:hover {
    background: #f3f4f6 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  a[style*="githubBtn"]:hover {
    background: #000000 !important;
  }
  
  a[style*="emailBtn"]:hover {
    background: #e85a26 !important;
  }
`;
document.head.appendChild(styleSheet);

export default ProfileDetailModal;








