import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DevCard from '../components/DevCard';
import { API_BASE_URL } from '../services/api';

const DevCardPage = () => {
  const [form, setForm] = useState({ username: '', email: '', name: '', linkedin: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.username.trim()) { setError('Please enter a GitHub username.'); return; }
    setLoading(true);
    setError('');
    setCardData(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/devcard/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_username: form.username.trim(),
          email: form.email || undefined,
          name: form.name || undefined,
          linkedin_url: form.linkedin || undefined,
          phone: form.phone || undefined,
        }),
      });
      const data = await resp.json();
      if (data.success && data.card) {
        setCardData(data.card);
      } else {
        setError(data.detail || 'Could not generate DevCard. Please check the username and try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/dev/${cardData?.github_username}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const link = document.createElement('a');
      link.download = `devcard-${cardData?.github_username}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert('Download failed. Please try again.');
    }
  };

  const handleLinkedIn = () => {
    const url = `${window.location.origin}/dev/${cardData?.github_username}`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px',
    fontSize: '14px', fontFamily: "'Outfit', sans-serif", color: '#1a1a1a',
    background: '#fafafa', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s',
  };
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Outfit', sans-serif" }}>
      <Navbar />

      {/* Hero */}
      <section style={{ padding: '4rem 2rem 2rem', background: 'linear-gradient(135deg, #fff 0%, #f0fdf4 100%)', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <span style={{ display: 'inline-block', background: '#E1F5EE', color: '#085041', fontSize: '13px', fontWeight: '600', padding: '4px 14px', borderRadius: '100px', marginBottom: '1rem' }}>Free · Instant · No signup</span>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.75rem' }}>Create your DevCard</h1>
          <p style={{ fontSize: '1.1rem', color: '#6b7280', lineHeight: '1.7' }}>
            Turn your GitHub into a beautiful, shareable developer card.
          </p>
        </div>
      </section>

      {/* Two-column layout */}
      <section style={{ padding: '2.5rem 2rem 5rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}>

          {/* Left: Form */}
          <div>
            <form onSubmit={handleGenerate}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>GitHub username *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>@</span>
                  <input
                    type="text" placeholder="torvalds" required
                    value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    style={{ ...inputStyle, paddingLeft: '28px' }}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #e5e7eb', margin: '1.5rem 0', textAlign: 'center' }}>
                <span style={{ position: 'relative', top: '-10px', background: '#fff', padding: '0 12px', fontSize: '12px', color: '#9ca3af', fontWeight: '600' }}>Optional — get notified about job matches</span>
              </div>

              {[
                ['email', 'Email', 'email', 'you@example.com'],
                ['name', 'Your name', 'text', 'Jane Smith'],
                ['linkedin', 'LinkedIn URL', 'url', 'linkedin.com/in/...'],
                ['phone', 'Phone', 'tel', '+1 234 567 890'],
              ].map(([key, lbl, type, ph]) => (
                <div key={key} style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>{lbl}</label>
                  <input type={type} placeholder={ph} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '13px', marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '14px', background: loading ? '#9ca3af' : '#FF6B35', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: "'Outfit', sans-serif", fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                {loading ? (
                  <>
                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Generating...
                  </>
                ) : 'Generate my DevCard →'}
              </button>
            </form>

            {/* Action buttons */}
            {cardData && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleCopyLink}
                    style={{ flex: 1, padding: '10px', background: copied ? '#10b981' : '#fff', color: copied ? '#fff' : '#1a1a1a', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontFamily: "'Outfit', sans-serif", fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
                    {copied ? '✓ Copied!' : '🔗 Copy link'}
                  </button>
                  <button onClick={handleDownload}
                    style={{ flex: 1, padding: '10px', background: '#fff', color: '#1a1a1a', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontFamily: "'Outfit', sans-serif", fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    ⬇ Download PNG
                  </button>
                  <button onClick={handleLinkedIn}
                    style={{ flex: 1, padding: '10px', background: '#0A66C2', color: '#fff', border: 'none', borderRadius: '8px', fontFamily: "'Outfit', sans-serif", fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    in Share
                  </button>
                </div>

                {form.email && (
                  <div style={{ background: '#E1F5EE', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#085041' }}>
                    Looking for tech jobs? Our AI job agent is coming soon. You're on the list!
                  </div>
                )}
                <div style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
                  Hiring developers?{' '}
                  <Link to="/for-companies" style={{ color: '#FF6B35', textDecoration: 'none', fontWeight: '600' }}>Search 200K+ profiles →</Link>
                </div>
              </div>
            )}
          </div>

          {/* Right: Card preview */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {!cardData ? (
              /* Skeleton */
              <div style={{ width: '100%', maxWidth: '420px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                <div style={{ background: '#1a1a2e', padding: '20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#2e2e4e' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '18px', background: '#2e2e4e', borderRadius: '4px', marginBottom: '8px', width: '60%' }} />
                    <div style={{ height: '13px', background: '#2e2e4e', borderRadius: '4px', marginBottom: '6px', width: '80%' }} />
                    <div style={{ height: '12px', background: '#2e2e4e', borderRadius: '4px', width: '40%' }} />
                  </div>
                </div>
                <div style={{ background: '#fff', padding: '20px 24px' }}>
                  {[100, 80, 65, 90, 55, 75].map((w, i) => (
                    <div key={i} style={{ height: '12px', background: '#f3f4f6', borderRadius: '4px', marginBottom: '10px', width: `${w}%` }} />
                  ))}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    {[60, 45, 35].map((w, i) => <div key={i} style={{ height: '24px', background: '#eef2ff', borderRadius: '100px', width: `${w}px` }} />)}
                  </div>
                </div>
                <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 24px', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ height: '12px', background: '#e5e7eb', borderRadius: '4px', width: '120px' }} />
                  <div style={{ height: '12px', background: '#e5e7eb', borderRadius: '4px', width: '80px' }} />
                </div>
              </div>
            ) : (
              <div ref={cardRef}>
                <DevCard cardData={cardData} />
              </div>
            )}
            {!cardData && (
              <p style={{ marginTop: '1.25rem', fontSize: '13px', color: '#9ca3af', textAlign: 'center' }}>
                Enter a GitHub username and click Generate to see your DevCard
              </p>
            )}
          </div>
        </div>
      </section>

      <Footer />
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .devcard-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default DevCardPage;
