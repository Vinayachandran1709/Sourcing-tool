import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../services/api';

const developerSteps = [
  { number: '01', title: 'Sign up', description: 'Create your candidate account in minutes.' },
  { number: '02', title: 'AI analyzes your GitHub & resume', description: 'We turn your code and experience into a structured profile.' },
  { number: '03', title: 'Talk to our AI interviewer', description: 'A short async interview verifies your depth, strengths, and preferences.' },
  { number: '04', title: 'Get matched to startup jobs', description: 'You see funded startup roles tuned to your background.' },
];

const companySteps = [
  { number: '01', title: 'Post your job for free', description: 'Share your role, requirements, and team context in one simple flow.' },
  { number: '02', title: 'AI analyzes your requirements', description: 'We extract must-haves, seniority, and startup-fit signals.' },
  { number: '03', title: 'Receive matched candidates in 24 hours', description: 'We send vetted profiles straight to your inbox.' },
];

const HomePage = () => {
  const [latestJobs, setLatestJobs] = useState([]);
  const [jobsTotal, setJobsTotal] = useState(100);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchLatestJobs = async () => {
      try {
        const response = await api.get('/api/jobs/feed?limit=10');
        if (response.data?.success) {
          setLatestJobs(Array.isArray(response.data.jobs) ? response.data.jobs : []);
          if (typeof response.data.total === 'number' && response.data.total > 0) {
            setJobsTotal(response.data.total);
          }
        }
      } catch (err) {
        console.error('Failed to fetch public job feed', err);
      }
    };

    fetchLatestJobs();
  }, []);

  const formatJobSummary = (job) => {
    const location = job.location || job.remote_policy || 'Location TBD';
    const fundingStage = job.funding_stage || 'Startup';
    const investors = job.investors_summary ? ` (${job.investors_summary})` : '';
    return `${job.title} at ${job.company_name} — ${location} — ${fundingStage}${investors}`;
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <section style={styles.heroSection}>
        <div style={styles.heroGrid} className="homepage-hero-grid">
          <div>
            <div style={styles.heroPill}>AI-matched startup hiring</div>
            <h1 style={styles.heroTitle}>Your AI recruiter for startup jobs</h1>
            <p style={styles.heroSubtitle}>
              Get deeply evaluated by AI. Get matched to funded startup opportunities.
            </p>
            <div style={styles.heroCtas}>
              <Link to="/candidate/signup" style={styles.primaryCta}>Join as Developer →</Link>
              <Link to="/post-job" style={styles.secondaryCta}>Post a Job Free →</Link>
            </div>
          </div>

          <div style={styles.heroCard}>
            <div style={styles.heroCardGlow} />
            <div style={styles.heroMetricRow}>
              <div>
                <p style={styles.metricValue}>AI-evaluated</p>
                <p style={styles.metricLabel}>GitHub + resume + interview in one profile</p>
              </div>
            </div>
            <div style={styles.heroMiniCards}>
              <div style={styles.heroMiniCard}>
                <span style={styles.miniBadge}>Developer</span>
                <p style={styles.miniTitle}>From profile to matched jobs</p>
                <p style={styles.miniText}>Structured skills, role fit, startup preferences, and hiring-readiness.</p>
              </div>
              <div style={styles.heroMiniCard}>
                <span style={{ ...styles.miniBadge, background: '#eef2ff', color: '#4338ca' }}>Company</span>
                <p style={styles.miniTitle}>From job post to shortlisted talent</p>
                <p style={styles.miniText}>Clearer role requirements and faster candidate delivery for startup teams.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={styles.howSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>How It Works</h2>
          <p style={styles.sectionSubtitle}>Two simple flows, one marketplace built for startup hiring.</p>
        </div>

        <div style={styles.dualGrid} className="homepage-dual-grid">
          <div style={styles.flowCard}>
            <div style={styles.flowEyebrow}>For Developers</div>
            <h3 style={styles.flowTitle}>Go from import to startup matches</h3>
            <div style={styles.stepList}>
              {developerSteps.map((step) => (
                <div key={step.number} style={styles.stepRow}>
                  <div style={styles.stepIcon}>{step.number}</div>
                  <div>
                    <p style={styles.stepTitle}>{step.title}</p>
                    <p style={styles.stepDescription}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.flowCard}>
            <div style={styles.flowEyebrow}>For Companies</div>
            <h3 style={styles.flowTitle}>Post once, get matched fast</h3>
            <div style={styles.stepList}>
              {companySteps.map((step) => (
                <div key={step.number} style={styles.stepRow}>
                  <div style={{ ...styles.stepIcon, background: '#fff4ef', color: '#FF6B35' }}>{step.number}</div>
                  <div>
                    <p style={styles.stepTitle}>{step.title}</p>
                    <p style={styles.stepDescription}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {latestJobs.length > 0 && (
        <section style={styles.jobsSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Latest Startup Engineering Jobs</h2>
            <p style={styles.sectionSubtitle}>Fresh roles discovered from funded startups and portfolio company hiring pages.</p>
          </div>

          <div style={styles.jobsList}>
            {latestJobs.map((job) => (
              <div key={job.id} style={styles.jobRow} className="homepage-job-row">
                <div style={styles.jobInfo}>
                  <p style={styles.jobSummary}>{formatJobSummary(job)}</p>
                </div>
                <a href={job.apply_url} target="_blank" rel="noreferrer" style={styles.jobButton}>
                  Apply →
                </a>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px' }}>
            <Link to="/candidate/signup" style={styles.jobsFooterLink}>Join to see all matched jobs →</Link>
          </div>
        </section>
      )}

      <section style={styles.statsSection}>
        <div style={styles.statsBar} className="homepage-stats-bar">
          <div style={styles.statItem}>
            <span style={styles.statNumber}>500+</span>
            <span style={styles.statLabel}>developers registered</span>
          </div>
          <div style={styles.statDivider} className="homepage-stat-divider" />
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{jobsTotal}+</span>
            <span style={styles.statLabel}>startup jobs live</span>
          </div>
          <div style={styles.statDivider} className="homepage-stat-divider" />
          <div style={styles.statItem}>
            <span style={styles.statNumber}>50+</span>
            <span style={styles.statLabel}>funded startups hiring</span>
          </div>
        </div>
      </section>

      <section style={styles.companyCtaSection}>
        <div style={styles.companyCtaCard} className="homepage-company-cta">
          <div>
            <p style={styles.flowEyebrow}>For Companies</p>
            <h2 style={styles.companyCtaTitle}>Make your first tech hire — free</h2>
            <p style={styles.companyCtaText}>
              Tell us what you&apos;re looking for. Our AI matches developer profiles from our vetted talent pool and sends them to your inbox within 24 hours.
            </p>
          </div>
          <Link to="/post-job" style={styles.primaryCta}>Post a Job →</Link>
        </div>
      </section>

      <Footer />

      <style>{`
        @media (max-width: 900px) {
          .homepage-hero-grid,
          .homepage-dual-grid {
            grid-template-columns: 1fr !important;
          }
          .homepage-stats-bar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .homepage-stat-divider {
            width: 100% !important;
            height: 1px !important;
          }
          .homepage-job-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .homepage-company-cta {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: '#ffffff', fontFamily: "'Outfit', sans-serif" },
  heroSection: { padding: '4.5rem 2rem 3rem', background: 'radial-gradient(circle at top left, #fff4ef 0%, #ffffff 48%, #fff8f4 100%)' },
  heroGrid: { maxWidth: '1180px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '28px', alignItems: 'center' },
  heroPill: { display: 'inline-block', padding: '6px 14px', borderRadius: '999px', background: '#fff1eb', color: '#FF6B35', fontWeight: '700', fontSize: '0.88rem', marginBottom: '1rem' },
  heroTitle: { margin: '0 0 14px 0', color: '#1a1a2e', fontSize: 'clamp(2.7rem, 5vw, 4.8rem)', lineHeight: '0.98', fontWeight: '800' },
  heroSubtitle: { margin: '0 0 24px 0', maxWidth: '640px', color: '#52525b', fontSize: '1.12rem', lineHeight: '1.8' },
  heroCtas: { display: 'flex', gap: '14px', flexWrap: 'wrap' },
  primaryCta: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '14px 22px', borderRadius: '14px', background: '#FF6B35', color: '#fff', textDecoration: 'none', fontWeight: '700', fontSize: '1rem' },
  secondaryCta: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '14px 22px', borderRadius: '14px', background: '#fff', color: '#1a1a2e', textDecoration: 'none', fontWeight: '700', fontSize: '1rem', border: '1px solid #e4e4e7' },
  heroCard: { position: 'relative', overflow: 'hidden', background: '#1a1a2e', color: '#fff', borderRadius: '28px', padding: '28px', boxShadow: '0 24px 60px rgba(26, 26, 46, 0.18)' },
  heroCardGlow: { position: 'absolute', inset: '-20% auto auto -10%', width: '220px', height: '220px', background: 'rgba(255, 107, 53, 0.24)', filter: 'blur(30px)', borderRadius: '50%' },
  heroMetricRow: { position: 'relative', zIndex: 1, marginBottom: '22px' },
  metricValue: { margin: '0 0 8px 0', fontSize: '1.7rem', fontWeight: '800' },
  metricLabel: { margin: 0, color: 'rgba(255,255,255,0.78)', lineHeight: '1.7' },
  heroMiniCards: { position: 'relative', zIndex: 1, display: 'grid', gap: '14px' },
  heroMiniCard: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '18px', padding: '18px' },
  miniBadge: { display: 'inline-block', marginBottom: '10px', padding: '5px 10px', borderRadius: '999px', background: '#fff1eb', color: '#FF6B35', fontWeight: '700', fontSize: '0.8rem' },
  miniTitle: { margin: '0 0 6px 0', fontWeight: '700', fontSize: '1rem' },
  miniText: { margin: 0, color: 'rgba(255,255,255,0.74)', lineHeight: '1.65' },
  howSection: { padding: '4.5rem 2rem', background: '#ffffff' },
  sectionHeader: { maxWidth: '960px', margin: '0 auto 26px', textAlign: 'center' },
  sectionTitle: { margin: '0 0 10px 0', color: '#1a1a2e', fontSize: '2.25rem', fontWeight: '800' },
  sectionSubtitle: { margin: 0, color: '#71717a', fontSize: '1rem', lineHeight: '1.7' },
  dualGrid: { maxWidth: '1180px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  flowCard: { background: '#fff', border: '1px solid #f1f5f9', borderRadius: '24px', padding: '26px', boxShadow: '0 18px 44px rgba(15, 23, 42, 0.05)' },
  flowEyebrow: { margin: '0 0 8px 0', color: '#FF6B35', fontWeight: '700', fontSize: '0.92rem', textTransform: 'uppercase', letterSpacing: '0.08em' },
  flowTitle: { margin: '0 0 18px 0', color: '#1a1a2e', fontWeight: '800', fontSize: '1.55rem' },
  stepList: { display: 'grid', gap: '16px' },
  stepRow: { display: 'grid', gridTemplateColumns: '54px 1fr', gap: '14px', alignItems: 'flex-start' },
  stepIcon: { width: '54px', height: '54px', borderRadius: '16px', background: '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.95rem' },
  stepTitle: { margin: '2px 0 6px 0', color: '#18181b', fontWeight: '700', fontSize: '1rem' },
  stepDescription: { margin: 0, color: '#71717a', lineHeight: '1.7' },
  jobsSection: { padding: '0 2rem 4rem', background: '#ffffff', maxWidth: '1180px', margin: '0 auto' },
  jobsList: { display: 'grid', gap: '12px' },
  jobRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '18px', padding: '18px 20px', borderRadius: '18px', background: '#fffaf7', border: '1px solid #ffe1d5' },
  jobInfo: { flex: 1 },
  jobSummary: { margin: 0, color: '#1f2937', lineHeight: '1.7', fontWeight: '500' },
  jobButton: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', padding: '11px 16px', borderRadius: '12px', background: '#FF6B35', color: '#fff', textDecoration: 'none', fontWeight: '700' },
  jobsFooterLink: { color: '#FF6B35', textDecoration: 'none', fontWeight: '700', fontSize: '1rem' },
  statsSection: { padding: '0 2rem 4rem', background: '#ffffff' },
  statsBar: { maxWidth: '1180px', margin: '0 auto', background: '#1a1a2e', borderRadius: '24px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px' },
  statItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  statNumber: { color: '#fff', fontWeight: '800', fontSize: '2rem', marginBottom: '4px' },
  statLabel: { color: 'rgba(255,255,255,0.72)', fontSize: '0.98rem' },
  statDivider: { width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.12)' },
  companyCtaSection: { padding: '0 2rem 5rem', background: '#ffffff' },
  companyCtaCard: { maxWidth: '1180px', margin: '0 auto', background: 'linear-gradient(135deg, #fff5ef 0%, #ffffff 100%)', border: '1px solid #ffe0d4', borderRadius: '26px', padding: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' },
  companyCtaTitle: { margin: '0 0 10px 0', color: '#1a1a2e', fontSize: '2rem', fontWeight: '800' },
  companyCtaText: { margin: 0, maxWidth: '760px', color: '#71717a', lineHeight: '1.8', fontSize: '1rem' },
};

export default HomePage;
