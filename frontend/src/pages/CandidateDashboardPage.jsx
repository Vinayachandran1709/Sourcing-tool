import React, { useEffect, useState } from 'react';
import { useCandidateAuth } from '../contexts/CandidateAuthContext';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { getCandidateProfile } from '../services/candidateApi';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const CandidateDashboardPage = () => {
  const { candidate, candidateLogout } = useCandidateAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getCandidateProfile();
        if (data.success && data.candidate) {
          setProfileData(data.candidate);
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    candidateLogout();
    navigate('/candidate/login');
  };

  const handleStartImport = () => {
    navigate('/candidate/import');
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Use fresh profile data if available, fallback to context
  const user = profileData || candidate;
  const isImported = user?.onboarding_status === 'github_imported';
  const profile = user?.profile || {};

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Developer Dashboard</h1>
          <button onClick={handleLogout} style={styles.logoutBtn}>Log out</button>
        </div>

        {!isImported ? (
          <div style={styles.emptyStateCard}>
            <div style={styles.emptyStateIcon}>
              <AlertCircle size={48} color="#FF6B35" />
            </div>
            <h2 style={styles.cardTitle}>Complete Your Profile</h2>
            <p style={styles.emptyStateText}>
              Your profile is currently empty. Connect your GitHub and upload your resume to let our AI build your developer identity instantly.
            </p>
            <button onClick={handleStartImport} style={styles.actionBtn}>
              Start AI Import →
            </button>
          </div>
        ) : (
          <div style={styles.profileGrid} className="profile-grid-responsive">
            {/* Left Column: Summary & Main Info */}
            <div style={styles.mainColumn}>
              <div style={styles.card}>
                <div style={styles.profileHeader}>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" style={styles.avatar} />
                  ) : (
                    <div style={styles.avatarPlaceholder}>
                      {user?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <h2 style={{...styles.cardTitle, marginBottom: '4px'}}>{user?.name}</h2>
                    <div style={styles.roleHeader}>
                      <span style={styles.primaryRole}>{profile?.detected_role || 'Software Developer'}</span>
                      <span style={styles.seniorityBadge}>{profile?.seniority_level || 'Mid-Level'}</span>
                    </div>
                  </div>
                </div>

                {profile?.ai_summary && (
                  <div style={styles.summaryBox}>
                    <h3 style={styles.sectionTitle}>AI Summary</h3>
                    <p style={styles.summaryText}>{profile.ai_summary}</p>
                  </div>
                )}

                <div style={styles.skillsSection}>
                  <h3 style={styles.sectionTitle}>Top Skills</h3>
                  <div style={styles.tagCloud}>
                    {profile?.skills && profile.skills.length > 0 ? (
                      profile.skills.map((skill, idx) => (
                        <span key={idx} style={styles.skillTag}>{skill}</span>
                      ))
                    ) : (
                      <span style={styles.emptyText}>No skills detected yet.</span>
                    )}
                  </div>
                </div>
              </div>

              {profile?.github_analysis?.top_projects && profile.github_analysis.top_projects.length > 0 && (
                <div style={styles.card}>
                  <h3 style={styles.sectionTitle}>Top Projects</h3>
                  <div style={styles.projectsList}>
                    {profile.github_analysis.top_projects.map((proj, idx) => (
                      <div key={idx} style={styles.projectCard}>
                        <div style={styles.projectHeader}>
                          <span style={styles.projectName}>{proj.name}</span>
                          <span style={styles.projectStars}>★ {proj.stars}</span>
                        </div>
                        {proj.description && <p style={styles.projectDesc}>{proj.description}</p>}
                        {proj.language && <span style={styles.projectLang}>{proj.language}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Signals & Stats */}
            <div style={styles.sideColumn}>
              <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Engineering Signals</h3>
                <div style={styles.signalsList}>
                  <div style={styles.signalItem}>
                    <CheckCircle2 size={18} color="#10b981" />
                    <span>Has automated tests</span>
                  </div>
                  <div style={styles.signalItem}>
                    <CheckCircle2 size={18} color="#10b981" />
                    <span>Uses CI/CD pipelines</span>
                  </div>
                  <div style={styles.signalItem}>
                    <CheckCircle2 size={18} color="#10b981" />
                    <span>Consistent contributor</span>
                  </div>
                </div>
              </div>

              {profile?.github_analysis?.language_distribution && (
                <div style={styles.card}>
                  <h3 style={styles.sectionTitle}>Language Distribution</h3>
                  <div style={styles.languageBars}>
                    {Object.entries(profile.github_analysis.language_distribution).slice(0, 5).map(([lang, pct], idx) => (
                      <div key={idx} style={styles.langBarRow}>
                        <div style={styles.langBarLabel}>
                          <span>{lang}</span>
                          <span>{pct}%</span>
                        </div>
                        <div style={styles.langBarTrack}>
                          <div style={{...styles.langBarFill, width: \`\${pct}%\`}}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={styles.nextStepCard}>
                <h3 style={styles.sectionTitle}>Ready for the next step?</h3>
                <p style={styles.actionText}>Complete the AI screening to become "Match Ready".</p>
                <button style={styles.disabledBtn} disabled title="Coming in Phase 3">
                  Start AI Interview (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: '#fafafa', fontFamily: "'Outfit', sans-serif" },
  container: { maxWidth: '1000px', margin: '40px auto', padding: '0 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  title: { fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', margin: 0 },
  logoutBtn: { padding: '8px 16px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
  card: { background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6', marginBottom: '24px' },
  cardTitle: { fontSize: '1.5rem', fontWeight: '700', color: '#1a1a1a', margin: '0 0 16px 0' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#374151', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' },
  
  // Empty state
  emptyStateCard: { background: '#fff', borderRadius: '16px', padding: '48px 32px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6', textAlign: 'center' },
  emptyStateIcon: { marginBottom: '16px', display: 'flex', justifyContent: 'center' },
  emptyStateText: { color: '#6b7280', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 32px auto', lineHeight: '1.6' },
  actionBtn: { padding: '14px 32px', background: '#FF6B35', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.2s' },
  
  // Layout
  profileGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' },
  mainColumn: { display: 'flex', flexDirection: 'column' },
  sideColumn: { display: 'flex', flexDirection: 'column' },
  
  // Header
  profileHeader: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' },
  avatar: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' },
  avatarPlaceholder: { width: '80px', height: '80px', borderRadius: '50%', background: '#f3f4f6', color: '#9ca3af', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' },
  roleHeader: { display: 'flex', gap: '12px', alignItems: 'center' },
  primaryRole: { fontSize: '1.1rem', color: '#4b5563', fontWeight: '500' },
  seniorityBadge: { padding: '4px 10px', background: '#dbeafe', color: '#1e40af', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '600' },
  
  // Summary
  summaryBox: { background: '#fff7ed', padding: '20px', borderRadius: '12px', border: '1px solid #ffedd5', marginBottom: '24px' },
  summaryText: { margin: 0, color: '#9a3412', lineHeight: '1.6', fontSize: '1.05rem' },
  
  // Skills
  skillsSection: { marginTop: '8px' },
  tagCloud: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  skillTag: { background: '#f3f4f6', color: '#374151', padding: '6px 12px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '500' },
  emptyText: { color: '#9ca3af', fontStyle: 'italic' },
  
  // Projects
  projectsList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  projectCard: { padding: '16px', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#fafafa' },
  projectHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  projectName: { fontWeight: '600', color: '#111827', fontSize: '1.05rem' },
  projectStars: { color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' },
  projectDesc: { color: '#4b5563', fontSize: '0.9rem', margin: '0 0 12px 0', lineHeight: '1.5' },
  projectLang: { display: 'inline-block', fontSize: '0.8rem', color: '#FF6B35', background: '#fff0eb', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' },
  
  // Signals
  signalsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  signalItem: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', color: '#374151', fontWeight: '500' },
  
  // Language bars
  languageBars: { display: 'flex', flexDirection: 'column', gap: '12px' },
  langBarRow: { display: 'flex', flexDirection: 'column', gap: '4px' },
  langBarLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#4b5563', fontWeight: '600' },
  langBarTrack: { height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' },
  langBarFill: { height: '100%', background: '#FF6B35', borderRadius: '4px' },
  
  // Next step
  nextStepCard: { background: '#f8fafc', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', textAlign: 'center' },
  actionText: { color: '#475569', marginBottom: '16px', fontSize: '0.95rem', lineHeight: '1.5' },
  disabledBtn: { padding: '12px', background: '#cbd5e1', color: '#f8fafc', borderRadius: '8px', border: 'none', fontSize: '1rem', fontWeight: '600', width: '100%', cursor: 'not-allowed' }
};

// Add media queries for responsive grid
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @media (max-width: 768px) {
    .profile-grid-responsive {
      display: flex !important;
      flex-direction: column !important;
    }
  }
`;
document.head.appendChild(styleSheet);

export default CandidateDashboardPage;
