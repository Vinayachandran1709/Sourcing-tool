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

const FAQ = [
  { q: 'What do I get for free?', a: 'Up to 20 matched developer profiles sent to your email with names, scores, skills, and GitHub links.' },
  { q: 'How fast will I get profiles?', a: 'Most searches return instant matches from our database of 200,000+ developers. You\'ll receive the email within minutes.' },
  { q: 'Do I need to create an account?', a: 'No. Just enter your email and job requirements. Create an account later if you want to search on your own, send outreach emails, or save candidate lists.' },
  { q: 'What if I want more?', a: 'Sign up for a free trial to access the full search dashboard with advanced filters, email outreach, and candidate management.' },
];

const HireFreePage = () => {
  const [tab, setTab] = useState('quick');
  const [form, setForm] = useState({ role: '', location: '', skills: '', experience: 0, email: '', company: '' });
  const [jd, setJd] = useState({ text: '', email: '', company: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const resultRef = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const submit = async (payload) => {
    setLoading(true); setError(''); setResult(null);
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
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleQuick = (e) => {
    e.preventDefault();
    if (!form.email) { setError('Please enter your work email.'); return; }
    const skills = form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    submit({ company_email: form.email, company_name: form.company || undefined, job_title: form.role || 'Software Developer', required_skills: skills, preferred_location: form.location || undefined, experience_min: form.experience || 0 });
  };

  const handleJd = (e) => {
    e.preventDefault();
    if (!jd.email) { setError('Please enter your work email.'); return; }
    if (!jd.text || jd.text.length < 50) { setError('Please paste a job description (min 50 characters).'); return; }
    submit({ company_email: jd.email, company_name: jd.company || undefined, job_title: 'Developer', job_description: jd.text });
  };

  const inp = { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontFamily: "'Outfit', sans-serif", color: '#1a1a1a', background: '#fafafa', boxSizing: 'border-box', outline: 'none' };
  const lbl = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' };

  const resultEmail = tab === 'quick' ? form.email : jd.email;

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Outfit', sans-serif" }}>
      <Navbar />

      {/* Hero */}
      <section style={{ padding: '4rem 2rem 3rem', background: 'linear-gradient(135deg, #fff 0%, #fff8f5 100%)', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <span style={{ display: 'inline-block', background: '#fff5f2', color: '#FF6B35', fontSize: '13px', fontWeight: '600', padding: '4px 14px', borderRadius: '100px', marginBottom: '1rem', border: '1px solid #ffd5c5' }}>Free · No account needed</span>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '700', color: '#1a1a1a', marginBottom: '1rem' }}>Make your first tech hire — free</h1>
          <p style={{ fontSize: '1.0625rem', color: '#6b7280', lineHeight: '1.7' }}>
            Tell us what you're looking for. We'll match developer profiles from our database and send them to your inbox instantly.
          </p>
        </div>
      </section>

      {/* Form */}
      <section style={{ padding: '2rem 2rem 4rem' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', borderRadius: '10px', padding: '4px', marginBottom: '1.75rem', width: 'fit-content' }}>
            {[['quick', 'Quick search'], ['jd', 'Paste job description']].map(([k, l]) => (
              <button key={k} onClick={() => { setTab(k); setError(''); setResult(null); }}
                style={{ padding: '9px 22px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: '14px', fontWeight: '600', transition: 'all 0.15s', background: tab === k ? '#fff' : 'transparent', color: tab === k ? '#1a1a1a' : '#6b7280', boxShadow: tab === k ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            {tab === 'quick' ? (
              <form onSubmit={handleQuick}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div><label style={lbl}>Role</label>
                    <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={inp}>
                      <option value="">Any role</option>
                      {ROLE_OPTIONS.filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Location</label>
                    <select value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} style={inp}>
                      <option value="">Any location</option>
                      {LOCATION_OPTIONS.filter(Boolean).map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div><label style={lbl}>Skills (comma separated)</label>
                    <input type="text" placeholder="Python, FastAPI, React..." value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} style={inp} />
                  </div>
                  <div><label style={lbl}>Experience</label>
                    <select value={form.experience} onChange={e => setForm(p => ({ ...p, experience: parseInt(e.target.value) }))} style={inp}>
                      {EXPERIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div><label style={lbl}>Work email *</label>
                    <input type="email" placeholder="you@company.com" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inp} />
                  </div>
                  <div><label style={lbl}>Company (optional)</label>
                    <input type="text" placeholder="Acme Corp" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} style={inp} />
                  </div>
                </div>
                {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '1rem' }}>{error}</p>}
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '13px', background: loading ? '#9ca3af' : '#FF6B35', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: "'Outfit', sans-serif", fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Finding matches...' : 'Find matched developers →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJd}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={lbl}>Job description *</label>
                  <textarea rows={6} placeholder="Paste your job description here (minimum 50 characters)..." value={jd.text} onChange={e => setJd(p => ({ ...p, text: e.target.value }))}
                    style={{ ...inp, resize: 'vertical', minHeight: '130px' }} />
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{jd.text.length} characters</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div><label style={lbl}>Work email *</label>
                    <input type="email" placeholder="you@company.com" required value={jd.email} onChange={e => setJd(p => ({ ...p, email: e.target.value }))} style={inp} />
                  </div>
                  <div><label style={lbl}>Company (optional)</label>
                    <input type="text" placeholder="Acme Corp" value={jd.company} onChange={e => setJd(p => ({ ...p, company: e.target.value }))} style={inp} />
                  </div>
                </div>
                {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '1rem' }}>{error}</p>}
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '13px', background: loading ? '#9ca3af' : '#FF6B35', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: "'Outfit', sans-serif", fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Finding matches...' : 'Find matches →'}
                </button>
              </form>
            )}
          </div>

          {/* Results */}
          {result && (
            <div ref={resultRef} style={{ marginTop: '2rem' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 18px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px', color: '#16a34a' }}>✓</span>
                <span style={{ fontSize: '14px', color: '#15803d', fontWeight: '500' }}>
                  Found {result.matched_count} matching developers! Full profiles sent to {resultEmail}.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {(result.preview_profiles || []).map((p, i) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#9ca3af', letterSpacing: '2px' }}>{p.name_preview}</span>
                      <span style={{ background: '#f0fdf4', color: '#16a34a', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '100px' }}>{p.developer_score}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '3px' }}>{p.detected_role}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>{p.location}</div>
                    {p.languages?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {p.languages.slice(0, 3).map(l => <span key={l} style={{ fontSize: '11px', background: '#eef2ff', color: '#4338ca', borderRadius: '8px', padding: '2px 7px' }}>{l}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '15px', color: '#1a1a1a', fontWeight: '500', marginBottom: '1rem' }}>
                  Want to search all 200,000+ profiles with advanced filters?
                </p>
                <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 26px', background: '#FF6B35', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                  Sign up free →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '5rem 2rem', background: '#f9fafb' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '2.5rem' }}>Frequently asked questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {FAQ.map(({ q, a }) => (
              <div key={q} style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#1a1a1a', margin: '0 0 0.5rem' }}>{q}</h4>
                <p style={{ fontSize: '0.9375rem', color: '#6b7280', lineHeight: '1.6', margin: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HireFreePage;
