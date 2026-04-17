import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DevCard from '../components/DevCard';

const SAMPLE_CARD = {
  github_username: 'rahul-agrawal',
  display_name: 'Rahul Agrawal',
  avatar_url: '',
  bio: 'Building reliable backend systems. OSS contributor. Python & Go.',
  location: 'Bangalore, India',
  detected_role: 'Backend Developer',
  seniority_level: 'Senior',
  primary_languages: ['Python', 'Go', 'TypeScript'],
  language_percentages: { Python: 54.0, Go: 31.0, TypeScript: 15.0 },
  top_projects: [
    { name: 'fast-queue', description: 'High-throughput task queue built on Redis', stars: 847, language: 'Go' },
    { name: 'pydantic-ext', description: 'Extensions for Pydantic v2 validation', stars: 412, language: 'Python' },
    { name: 'micro-bench', description: 'Microbenchmarking toolkit for Python services', stars: 189, language: 'Python' },
  ],
  contribution_stats: { stars: 1448, repos: 34, followers: 312, years_active: 7 },
  ai_summary: 'Senior backend engineer with 7+ years of experience in Python and Go. Known for building high-performance distributed systems and active open-source contributions.',
  developer_score: 83,
  estimated_experience_years: 7,
  experience_history: [],
};

const VALUE_PROPS = [
  {
    icon: '🔬',
    title: 'Verified by code, not self-reported',
    desc: 'Your tech stack percentages come from real repository analysis — not what you claim on a resume. Recruiters see what you actually build.',
  },
  {
    icon: '🤖',
    title: 'AI-generated recruiter brief',
    desc: 'No more writing cover letters. The AI reads your GitHub profile and summarises your strengths in 2 sentences, tailored for recruiters.',
  },
  {
    icon: '🔗',
    title: 'Shareable everywhere',
    desc: 'Download your DevCard as a PNG, share the link, attach it to job applications, or pin it to your GitHub profile.',
  },
];

const ForCandidatesPage = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Outfit', sans-serif" }}>
      <Navbar />

      {/* Hero */}
      <section style={{ padding: '5rem 2rem 4rem', background: 'linear-gradient(135deg, #fff 0%, #E1F5EE 100%)', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <span style={{ display: 'inline-block', background: '#E1F5EE', color: '#085041', fontSize: '13px', fontWeight: '600', padding: '4px 14px', borderRadius: '100px', marginBottom: '1.25rem', border: '1px solid #a7e3cd' }}>For Developers</span>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: '700', color: '#1a1a1a', marginBottom: '1rem', lineHeight: '1.2' }}>
            Your code tells a better story than your resume
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#4b5563', lineHeight: '1.7', marginBottom: '2.5rem' }}>
            Create a verified developer profile in 10 seconds. Share it with recruiters, attach it to applications, pin it to your GitHub.
          </p>
          <Link to="/devcard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', background: '#085041', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '15px' }}>
            Create your DevCard — free →
          </Link>
        </div>
      </section>

      {/* DevCard showcase */}
      <section style={{ padding: '5rem 2rem', background: '#f9fafb' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '0.5rem' }}>Here's what a DevCard looks like</h2>
          <p style={{ fontSize: '0.9375rem', color: '#6b7280', textAlign: 'center', marginBottom: '2.5rem' }}>
            Yours is generated from your actual GitHub data — instantly.
          </p>
          <DevCard cardData={SAMPLE_CARD} />
          <p style={{ marginTop: '1.25rem', fontSize: '13px', color: '#9ca3af', textAlign: 'center' }}>
            Sample card · Your DevCard will use your real GitHub data
          </p>
          <Link to="/devcard"
            style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: '#085041', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
            Generate mine →
          </Link>
        </div>
      </section>

      {/* Value props */}
      <section style={{ padding: '5rem 2rem', background: '#fff' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '3rem' }}>Why developers use TalentBox</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {VALUE_PROPS.map(v => (
              <div key={v.title} style={{ padding: '2rem', background: '#f9fafb', borderRadius: '16px', border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>{v.icon}</div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.5rem' }}>{v.title}</h3>
                <p style={{ fontSize: '0.9375rem', color: '#6b7280', lineHeight: '1.6', margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Job Agent coming soon */}
      <section style={{ padding: '5rem 2rem', background: 'linear-gradient(135deg, #E1F5EE, #c5f0dc)', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <span style={{ display: 'inline-block', background: '#085041', color: '#fff', fontSize: '12px', fontWeight: '700', padding: '4px 12px', borderRadius: '100px', marginBottom: '1.25rem', letterSpacing: '0.5px' }}>COMING SOON</span>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#085041', marginBottom: '1rem' }}>AI Job Agent</h2>
          <p style={{ fontSize: '1.0625rem', color: '#145c48', lineHeight: '1.7', marginBottom: '2rem' }}>
            We're building an AI that finds and applies to tech jobs for you. Create your DevCard now to be first in line when we launch.
          </p>
          <Link to="/devcard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', background: '#085041', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '15px' }}>
            Create your DevCard →
          </Link>
          <p style={{ marginTop: '1rem', fontSize: '13px', color: '#145c48' }}>Free forever · No signup required</p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ForCandidatesPage;
