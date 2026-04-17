import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API_BASE_URL } from '../services/api';

const ROLE_OPTIONS = [
  '', 'Frontend Developer', 'Backend Developer', 'Full-Stack Developer',
  'Mobile Developer', 'DevOps Engineer', 'Data Scientist', 'AI/ML Engineer',
  'Data Engineer', 'Security Engineer', 'QA Engineer', 'Blockchain Developer',
  'Game Developer', 'Embedded Engineer', 'Software Developer',
];

const LOCATION_OPTIONS = [
  '', 'San Francisco', 'New York', 'Seattle', 'Austin', 'Los Angeles',
  'Boston', 'Chicago', 'Bangalore', 'Mumbai', 'Hyderabad', 'Delhi', 'Pune',
  'London', 'Berlin', 'Amsterdam', 'Paris', 'Dublin', 'Singapore', 'Remote',
];

const EXPERIENCE_OPTIONS = [
  { label: 'Any experience', value: 0 },
  { label: '1+ years', value: 1 },
  { label: '3+ years', value: 3 },
  { label: '5+ years', value: 5 },
  { label: '8+ years', value: 8 },
];

const HomePage = () => {
  const [hireTab, setHireTab] = useState('quick');
  const [hireForm, setHireForm] = useState({ role: '', location: '', skills: '', experience: 0, email: '', company: '' });
  const [jdForm, setJdForm] = useState({ jd: '', email: '', company: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [hoveredCard, setHoveredCard] = useState(null);
  const resultRef = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const submitHireFree = async (payload) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/hire-free`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (data.success) {
        setResult(data);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        setError(data.detail || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (!hireForm.email) { setError('Please enter your work email.'); return; }
    const skills = hireForm.skills ? hireForm.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    submitHireFree({
      company_email: hireForm.email,
      company_name: hireForm.company || undefined,
      job_title: hireForm.role || 'Software Developer',
      required_skills: skills,
      preferred_location: hireForm.location || undefined,
      experience_min: hireForm.experience || 0,
    });
  };

  const handleJdSubmit = (e) => {
    e.preventDefault();
    if (!jdForm.email) { setError('Please enter your work email.'); return; }
    if (!jdForm.jd || jdForm.jd.length < 50) { setError('Please paste a job description (min 50 characters).'); return; }
    submitHireFree({
      company_email: jdForm.email,
      company_name: jdForm.company || undefined,
      job_title: 'Developer',
      job_description: jdForm.jd,
    });
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px',
    fontSize: '14px', fontFamily: "'Outfit', sans-serif", color: '#1a1a1a',
    background: '#fff', boxSizing: 'border-box', outline: 'none',
  };
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' };

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Outfit', sans-serif" }}>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{ padding: '5rem 2rem 3rem', background: 'linear-gradient(135deg, #fff 0%, #fff8f5 100%)', textAlign: 'center' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: '700', color: '#1a1a1a', marginBottom: '1rem', lineHeight: '1.15' }}>
            The tech talent platform
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#6b7280', maxWidth: '600px', margin: '0 auto 3rem', lineHeight: '1.7' }}>
            Whether you're hiring developers or looking for your next role — we've got you.
          </p>

          {/* Split cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', maxWidth: '860px', margin: '0 auto' }}>
            {/* Recruiter card */}
            <div
              onMouseEnter={() => setHoveredCard('hire')}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: '#E6F1FB', borderRadius: '20px', padding: '2.5rem 2rem',
                textAlign: 'left', transition: 'all 0.2s',
                transform: hoveredCard === 'hire' ? 'translateY(-6px)' : 'none',
                boxShadow: hoveredCard === 'hire' ? '0 16px 40px rgba(12,68,124,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ width: '52px', height: '52px', background: '#0C447C', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                </svg>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0C447C', marginBottom: '0.75rem' }}>I'm hiring developers</h2>
              <p style={{ fontSize: '0.9375rem', color: '#1e5b9e', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                Source, evaluate, and reach top tech talent from 200K+ verified developer profiles
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['Search 200K+ profiles', 'AI-scored candidates (0–100)', 'Built-in email outreach', 'Post jobs, get matched profiles'].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#1e5b9e' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0C447C" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', background: '#0C447C', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9375rem' }}>
                Start sourcing →
              </Link>
            </div>

            {/* Developer card */}
            <div
              onMouseEnter={() => setHoveredCard('dev')}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: '#E1F5EE', borderRadius: '20px', padding: '2.5rem 2rem',
                textAlign: 'left', transition: 'all 0.2s',
                transform: hoveredCard === 'dev' ? 'translateY(-6px)' : 'none',
                boxShadow: hoveredCard === 'dev' ? '0 16px 40px rgba(8,80,65,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ width: '52px', height: '52px', background: '#085041', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                </svg>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#085041', marginBottom: '0.75rem' }}>I'm a developer</h2>
              <p style={{ fontSize: '0.9375rem', color: '#145c48', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                Create your verified developer card — powered by your actual code contributions
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['AI-generated profile from GitHub', 'Verified tech stack from real code', 'Shareable DevCard for job applications', 'AI job agent coming soon'].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#145c48' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#085041" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/devcard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', background: '#085041', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9375rem' }}>
                Create your DevCard →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FIRST HIRE FREE ── */}
      <section style={{ padding: '5rem 2rem', background: '#f9fafb' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '0.5rem' }}>
            Make your first tech hire — free
          </h2>
          <p style={{ fontSize: '1rem', color: '#6b7280', textAlign: 'center', marginBottom: '2rem', lineHeight: '1.7' }}>
            Tell us what you're looking for. We'll match developer profiles from our database of 200,000+ and send them to your inbox.
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: '#e5e7eb', borderRadius: '10px', padding: '4px', marginBottom: '2rem', width: 'fit-content', margin: '0 auto 2rem' }}>
            {[['quick', 'Quick search'], ['jd', 'Upload job description']].map(([key, label]) => (
              <button key={key} onClick={() => { setHireTab(key); setError(''); setResult(null); }}
                style={{ padding: '8px 20px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: '14px', fontWeight: '600', transition: 'all 0.15s', background: hireTab === key ? '#fff' : 'transparent', color: hireTab === key ? '#1a1a1a' : '#6b7280', boxShadow: hireTab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '2rem' }}>
            {hireTab === 'quick' ? (
              <form onSubmit={handleQuickSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Role</label>
                    <select value={hireForm.role} onChange={e => setHireForm(p => ({ ...p, role: e.target.value }))} style={inputStyle}>
                      <option value="">Any role</option>
                      {ROLE_OPTIONS.filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Location</label>
                    <select value={hireForm.location} onChange={e => setHireForm(p => ({ ...p, location: e.target.value }))} style={inputStyle}>
                      <option value="">Any location</option>
                      {LOCATION_OPTIONS.filter(Boolean).map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Skills (comma separated)</label>
                    <input type="text" placeholder="Python, FastAPI, PostgreSQL" value={hireForm.skills} onChange={e => setHireForm(p => ({ ...p, skills: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Experience</label>
                    <select value={hireForm.experience} onChange={e => setHireForm(p => ({ ...p, experience: parseInt(e.target.value) }))} style={inputStyle}>
                      {EXPERIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={labelStyle}>Your work email *</label>
                    <input type="email" placeholder="you@company.com" required value={hireForm.email} onChange={e => setHireForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Company name (optional)</label>
                    <input type="text" placeholder="Acme Corp" value={hireForm.company} onChange={e => setHireForm(p => ({ ...p, company: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '1rem' }}>{error}</p>}
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '12px', background: loading ? '#9ca3af' : '#FF6B35', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: "'Outfit', sans-serif", fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                  {loading ? 'Finding matches...' : 'Find matched developers →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJdSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Job description *</label>
                  <textarea rows={5} placeholder="Paste your job description here (minimum 50 characters)..." value={jdForm.jd} onChange={e => setJdForm(p => ({ ...p, jd: e.target.value }))}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '120px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={labelStyle}>Your work email *</label>
                    <input type="email" placeholder="you@company.com" required value={jdForm.email} onChange={e => setJdForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Company name (optional)</label>
                    <input type="text" placeholder="Acme Corp" value={jdForm.company} onChange={e => setJdForm(p => ({ ...p, company: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '1rem' }}>{error}</p>}
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '12px', background: loading ? '#9ca3af' : '#FF6B35', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: "'Outfit', sans-serif", fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                  {loading ? 'Finding matches...' : 'Find matches →'}
                </button>
              </form>
            )}
          </div>

          {/* Results */}
          {result && (
            <div ref={resultRef} style={{ marginTop: '2rem' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 18px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#16a34a', fontSize: '18px' }}>✓</span>
                <span style={{ fontSize: '14px', color: '#15803d', fontWeight: '500' }}>
                  Found {result.matched_count} matching developers! Full profiles sent to {result.preview_profiles?.length > 0 ? (hireTab === 'quick' ? hireForm.email : jdForm.email) : 'your inbox'}.
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {(result.preview_profiles || []).map((p, i) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#9ca3af', letterSpacing: '2px' }}>{p.name_preview}</div>
                      <span style={{ background: '#f0fdf4', color: '#16a34a', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '100px' }}>{p.developer_score}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{p.detected_role}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{p.location}</div>
                    {p.languages?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                        {p.languages.slice(0, 3).map(l => <span key={l} style={{ fontSize: '11px', background: '#eef2ff', color: '#4338ca', borderRadius: '8px', padding: '2px 8px' }}>{l}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', padding: '1.5rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
                <p style={{ fontSize: '15px', color: '#1a1a1a', fontWeight: '500', marginBottom: '1rem' }}>
                  Want to search all 200,000+ profiles with advanced filters?
                </p>
                <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: '#FF6B35', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                  Sign up free →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '4rem 2rem', background: '#ffffff' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', textAlign: 'center' }}>
          {[['200,000+', 'Profiles indexed'], ['50+', 'Cities covered'], ['30+', 'Programming languages']].map(([num, lbl]) => (
            <div key={lbl} style={{ padding: '2rem 1rem', background: '#f9fafb', borderRadius: '16px' }}>
              <div style={{ fontSize: '2.25rem', fontWeight: '800', color: '#FF6B35', marginBottom: '6px' }}>{num}</div>
              <div style={{ fontSize: '0.9375rem', color: '#6b7280' }}>{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '5rem 2rem', background: '#f9fafb' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '0.5rem' }}>How it works</h2>
          <p style={{ fontSize: '1rem', color: '#6b7280', textAlign: 'center', marginBottom: '3rem' }}>Three simple steps to find your next hire</p>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {[
              ['1', 'Search by role & skills', 'Filter developers by role, location, programming language, and experience level.'],
              ['2', 'Review scored profiles', 'Every developer is scored 0–100 based on verified code contributions, activity, and community impact.'],
              ['3', 'Reach out directly', 'Send personalized emails to developers directly from the platform. Track responses.'],
            ].map(([n, title, desc], i, arr) => (
              <React.Fragment key={n}>
                <div style={{ textAlign: 'center', maxWidth: '280px' }}>
                  <div style={{ width: '52px', height: '52px', background: '#FF6B35', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: '700', margin: '0 auto 1rem' }}>{n}</div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.5rem' }}>{title}</h3>
                  <p style={{ fontSize: '0.9375rem', color: '#6b7280', lineHeight: '1.6' }}>{desc}</p>
                </div>
                {i < arr.length - 1 && <div style={{ fontSize: '1.75rem', color: '#d1d5db', paddingTop: '1rem' }}>→</div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '5rem 2rem', background: 'linear-gradient(135deg, #FF6B35, #ff8a65)', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Ready to find your next developer?</h2>
          <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.9)', marginBottom: '2rem' }}>Start free, no credit card required.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ padding: '12px 28px', background: '#fff', color: '#FF6B35', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '15px' }}>
              Start sourcing →
            </Link>
            <Link to="/devcard" style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '15px', border: '1px solid rgba(255,255,255,0.4)' }}>
              Create your DevCard →
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        @media (max-width: 768px) {
          .homepage-split { grid-template-columns: 1fr !important; }
          .homepage-stats { grid-template-columns: 1fr !important; }
          .hire-form-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
