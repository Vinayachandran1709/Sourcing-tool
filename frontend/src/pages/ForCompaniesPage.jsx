import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const FEATURES = [
  { icon: '🔍', title: 'Smart developer search', desc: 'Search by role, location, programming language, experience, and developer score. Hundreds of filter combinations.' },
  { icon: '🏆', title: 'AI-scored profiles', desc: 'Every developer is scored 0–100 based on real code contributions, GitHub activity, repo stars, and follower count.' },
  { icon: '✉️', title: 'Built-in email outreach', desc: 'Send personalized emails directly from the platform using your own templates. Track sent emails and responses.' },
  { icon: '📊', title: 'Usage dashboard', desc: 'Real-time visibility into your searches, profile unlocks, emails sent, and remaining credits.' },
];

const PLANS = [
  {
    name: 'Free Trial', price: '$0', period: '14 days', color: '#FF6B35',
    features: ['25 searches', '50 profile unlocks', '50 emails', '5 CSV exports', '200K+ developer access'],
    cta: 'Start free trial', href: '/signup', outline: true,
  },
  {
    name: 'Starter', price: '$39', period: '/month', color: '#FF6B35', popular: true,
    features: ['500 searches/month', '1,000 profile unlocks', '1,000 emails/month', '50 CSV exports', 'All filters & scores'],
    cta: 'Get started', href: '/signup',
  },
  {
    name: 'Growth', price: '$79', period: '/month', color: '#FF6B35',
    features: ['Unlimited searches', '3,000 profile unlocks', '3,000 emails/month', 'Unlimited CSV exports', 'Priority support'],
    cta: 'Get Growth', href: '/signup',
  },
];

const ForCompaniesPage = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Outfit', sans-serif" }}>
      <Navbar />

      {/* Hero */}
      <section style={{ padding: '5rem 2rem 4rem', background: 'linear-gradient(135deg, #fff 0%, #E6F1FB 100%)', textAlign: 'center' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <span style={{ display: 'inline-block', background: '#E6F1FB', color: '#0C447C', fontSize: '13px', fontWeight: '600', padding: '4px 14px', borderRadius: '100px', marginBottom: '1.25rem', border: '1px solid #c3d9ef' }}>For Recruiters & Hiring Teams</span>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '700', color: '#1a1a1a', marginBottom: '1rem', lineHeight: '1.2' }}>
            Source top developers by their actual code
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#4b5563', lineHeight: '1.7', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
            Search 200,000+ developer profiles scored by verified contributions. Filter by role, location, and tech stack. Reach out directly.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ padding: '12px 28px', background: '#FF6B35', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '15px' }}>
              Start free trial →
            </Link>
            <Link to="/hire-free" style={{ padding: '12px 28px', background: '#fff', color: '#0C447C', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '15px', border: '2px solid #c3d9ef' }}>
              Post a job, get matches free →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '5rem 2rem', background: '#fff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '3rem' }}>Everything you need to hire great developers</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: '#f9fafb', borderRadius: '16px', padding: '2rem', border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{f.icon}</div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.9375rem', color: '#6b7280', lineHeight: '1.6', margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '5rem 2rem', background: '#f9fafb' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '0.5rem' }}>Simple pricing</h2>
          <p style={{ fontSize: '1rem', color: '#6b7280', textAlign: 'center', marginBottom: '3rem' }}>Start free. Upgrade when you're ready.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{ background: '#fff', borderRadius: '16px', padding: '2rem', border: plan.popular ? '2px solid #FF6B35' : '2px solid #e5e7eb', position: 'relative', boxShadow: plan.popular ? '0 8px 32px rgba(255,107,53,0.1)' : 'none' }}>
                {plan.popular && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#FF6B35', color: '#fff', fontSize: '12px', fontWeight: '600', padding: '3px 14px', borderRadius: '100px' }}>Most Popular</div>}
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.25rem' }}>{plan.name}</h3>
                <div style={{ marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1a1a1a' }}>{plan.price}</span>
                  <span style={{ fontSize: '0.9375rem', color: '#6b7280' }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9375rem', color: '#1a1a1a' }}>
                      <Check size={16} color="#10b981" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={plan.href}
                  style={{ display: 'block', width: '100%', padding: '12px', background: plan.outline ? '#fff' : '#FF6B35', color: plan.outline ? '#FF6B35' : '#fff', border: plan.outline ? '2px solid #FF6B35' : 'none', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '15px', textAlign: 'center', boxSizing: 'border-box' }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hire Free CTA */}
      <section style={{ padding: '5rem 2rem', background: 'linear-gradient(135deg, #E6F1FB, #d0e8f8)', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#0C447C', marginBottom: '1rem' }}>Make your first tech hire — free</h2>
          <p style={{ fontSize: '1.0625rem', color: '#1e5b9e', lineHeight: '1.7', marginBottom: '2rem' }}>
            Post one job, get matched developer profiles in your inbox. No credit card required.
          </p>
          <Link to="/hire-free"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', background: '#FF6B35', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '15px' }}>
            Post a job free →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ForCompaniesPage;
