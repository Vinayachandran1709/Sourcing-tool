import React from 'react';

const DevCard = ({ cardData }) => {
  if (!cardData) return null;

  const {
    github_username = '',
    display_name = '',
    avatar_url = '',
    location = '',
    detected_role = 'Software Developer',
    seniority_level = 'Mid-Level',
    primary_languages: _primaryLangs = [],
    language_percentages = {},
    top_projects = [],
    contribution_stats = {},
    ai_summary = '',
    developer_score = 0,
    estimated_experience_years = 0,
    experience_history = [],
  } = cardData;

  const scoreColor = developer_score >= 70 ? '#10b981' : developer_score >= 50 ? '#f59e0b' : '#6b7280';

  const initials = display_name
    ? display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (github_username || 'TB').slice(0, 2).toUpperCase();

  const langEntries = Object.entries(language_percentages || {}).slice(0, 6);

  return (
    <div style={s.card}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div style={s.avatarWrap}>
            {avatar_url ? (
              <img src={avatar_url} alt={display_name} style={s.avatar} />
            ) : (
              <div style={s.avatarFallback}>{initials}</div>
            )}
          </div>
          <div style={s.headerInfo}>
            <div style={s.name}>{display_name || github_username}</div>
            <div style={s.roleRow}>
              {seniority_level} {detected_role.toLowerCase()}
            </div>
            {location && (
              <div style={s.locationRow}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span style={s.locationText}>{location}</span>
              </div>
            )}
          </div>
        </div>
        {/* Score ring */}
        <div style={s.scoreRing}>
          <div style={{ ...s.scoreNumber, color: scoreColor }}>{developer_score}</div>
          <div style={s.scoreLabel}>score</div>
        </div>
      </div>

      {/* Body */}
      <div style={s.body}>
        {/* AI Summary */}
        {ai_summary && (
          <div style={s.summaryBlock}>
            <p style={s.summary}>{ai_summary}</p>
          </div>
        )}

        {/* Tech Stack */}
        {langEntries.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionLabel}>TECH STACK (verified from code)</div>
            <div style={s.tagRow}>
              {langEntries.map(([lang, pct]) => (
                <span key={lang} style={s.tag}>
                  {lang} {pct > 0 ? `${pct}%` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top Projects */}
        {top_projects && top_projects.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionLabel}>TOP PROJECTS</div>
            {top_projects.slice(0, 3).map((proj, i) => (
              <div key={i} style={s.projectRow}>
                <div style={s.projectLeft}>
                  <div style={s.projectName}>{proj.name}</div>
                  {proj.description && (
                    <div style={s.projectDesc}>{proj.description}</div>
                  )}
                </div>
                <div style={s.stars}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <span style={s.starsText}>{proj.stars}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={s.statsGrid}>
          <div style={s.statBox}>
            <div style={s.statNum}>{contribution_stats.stars || 0}</div>
            <div style={s.statLbl}>Stars earned</div>
          </div>
          <div style={s.statBox}>
            <div style={s.statNum}>{contribution_stats.repos || 0}</div>
            <div style={s.statLbl}>Repos</div>
          </div>
          <div style={s.statBox}>
            <div style={s.statNum}>{estimated_experience_years || contribution_stats.years_active || 0}</div>
            <div style={s.statLbl}>Yrs active</div>
          </div>
        </div>

        {/* Experience history */}
        {experience_history && experience_history.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionLabel}>EXPERIENCE (from resume)</div>
            {experience_history.map((exp, i) => (
              <div key={i} style={s.expRow}>
                <div style={s.expDot} />
                <div>
                  <div style={s.expCompany}>{exp.company}</div>
                  <div style={s.expTitle}>{exp.title}</div>
                  {exp.dates && <div style={s.expDates}>{exp.dates}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={s.footer}>
        <span style={s.footerLeft}>
          Verified by <strong style={{ color: '#FF6B35' }}>TalentBox</strong>
        </span>
        <span style={s.footerRight}>talentbox.co/dev/{github_username}</span>
      </div>
    </div>
  );
};

const s = {
  card: { width: '100%', maxWidth: '420px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontFamily: "'Outfit', sans-serif", background: '#fff' },
  header: { background: '#1a1a2e', padding: '20px 20px 20px', position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerInner: { display: 'flex', gap: '14px', alignItems: 'flex-start', flex: 1 },
  avatarWrap: { flexShrink: 0 },
  avatar: { width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)' },
  avatarFallback: { width: '64px', height: '64px', borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700' },
  headerInfo: { flex: 1, minWidth: 0 },
  name: { color: '#ffffff', fontSize: '18px', fontWeight: '600', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  roleRow: { color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '6px', textTransform: 'capitalize' },
  locationRow: { display: 'flex', alignItems: 'center', gap: '4px' },
  locationText: { color: 'rgba(255,255,255,0.5)', fontSize: '12px' },
  scoreRing: { width: '56px', height: '56px', borderRadius: '50%', border: '3px solid #10b981', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(16,185,129,0.08)' },
  scoreNumber: { fontSize: '16px', fontWeight: '700', lineHeight: 1 },
  scoreLabel: { color: '#9ca3af', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  body: { padding: '20px 24px', background: '#ffffff' },
  summaryBlock: { borderLeft: '2px solid #4f46e5', paddingLeft: '12px', marginBottom: '16px' },
  summary: { fontSize: '13px', color: '#4b5563', lineHeight: '1.6', margin: 0 },
  section: { marginBottom: '16px' },
  sectionLabel: { fontSize: '11px', color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  tag: { fontSize: '11px', background: '#eef2ff', color: '#4338ca', borderRadius: '12px', padding: '3px 10px', fontWeight: '500' },
  projectRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '8px', marginBottom: '8px', borderBottom: '1px solid #f3f4f6' },
  projectLeft: { flex: 1, minWidth: 0 },
  projectName: { fontSize: '13px', fontWeight: '600', color: '#1a1a1a' },
  projectDesc: { fontSize: '11px', color: '#6b7280', marginTop: '2px' },
  stars: { display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0, marginLeft: '8px' },
  starsText: { fontSize: '12px', color: '#f59e0b', fontWeight: '500' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' },
  statBox: { background: '#f9fafb', borderRadius: '8px', padding: '10px 8px', textAlign: 'center' },
  statNum: { fontSize: '16px', fontWeight: '700', color: '#1a1a1a' },
  statLbl: { fontSize: '10px', color: '#9ca3af', marginTop: '2px' },
  expRow: { display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' },
  expDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#4f46e5', marginTop: '4px', flexShrink: 0 },
  expCompany: { fontSize: '13px', fontWeight: '600', color: '#1a1a1a' },
  expTitle: { fontSize: '11px', color: '#6b7280' },
  expDates: { fontSize: '11px', color: '#9ca3af' },
  footer: { background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { fontSize: '12px', color: '#6b7280' },
  footerRight: { fontSize: '11px', color: '#4f46e5' },
};

export default DevCard;
