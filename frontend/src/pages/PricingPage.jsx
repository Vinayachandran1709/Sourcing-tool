import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles, Clock, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const starterMonthly = 79;
  const starterAnnual = Math.round(starterMonthly * 12 * 0.83);

  const handleEarlyAccess = () => {
    const subject = encodeURIComponent('Professional Plan Early Access');
    const body = encodeURIComponent(`Hi TalentBox Team,

I'm interested in getting early access to the Professional plan.

Company: 
Team Size: 
Current Hiring Needs: 

Looking forward to hearing from you!`);
    window.location.href = `mailto:vinay@talentbox.co?subject=${subject}&body=${body}`;
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <section style={styles.hero}>
        <div style={styles.container}>
          <h1 style={styles.title}>Simple, Transparent Pricing</h1>
          <p style={styles.subtitle}>Start free, upgrade when you're ready. No hidden fees.</p>

          {/* Toggle */}
          <div style={styles.toggleWrapper}>
            <span style={{ ...styles.toggleLabel, color: !isAnnual ? '#1a1a1a' : '#9ca3af' }}>Monthly</span>
            <button style={styles.toggle} onClick={() => setIsAnnual(!isAnnual)}>
              <div style={{ ...styles.toggleKnob, transform: isAnnual ? 'translateX(28px)' : 'translateX(4px)' }} />
            </button>
            <span style={{ ...styles.toggleLabel, color: isAnnual ? '#1a1a1a' : '#9ca3af' }}>Annual</span>
            <span style={styles.saveBadge}>Save 17%</span>
          </div>
        </div>
      </section>

      <section style={styles.pricingSection}>
        <div style={styles.container}>
          <div style={styles.pricingGrid}>
            
            {/* Free Trial */}
            <div style={styles.pricingCard}>
              <div style={styles.cardHeader}>
                <div style={styles.planIcon}><Clock size={24} color="#FF6B35" /></div>
                <h3 style={styles.planName}>Free Trial</h3>
                <p style={styles.planDesc}>Try TalentBox risk-free</p>
              </div>
              <div style={styles.priceWrapper}>
                <span style={styles.price}>$0</span>
                <span style={styles.period}>/ 14 days</span>
              </div>
              <ul style={styles.featureList}>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 25 searches</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 40 profile unlocks</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 25 emails</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Filter by programming languages</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Basic developer scoring</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Names & scores visible</li>
              </ul>
              <Link to="/signup" style={styles.trialBtn}>Start Free Trial</Link>
              <p style={styles.noCreditCard}>No credit card required</p>
            </div>

            {/* Starter */}
            <div style={{ ...styles.pricingCard, ...styles.popularCard }}>
              <div style={styles.popularBadge}>Most Popular</div>
              <div style={styles.cardHeader}>
                <div style={styles.planIcon}><Zap size={24} color="#FF6B35" /></div>
                <h3 style={styles.planName}>Starter</h3>
                <p style={styles.planDesc}>For growing teams</p>
              </div>
              <div style={styles.priceWrapper}>
                <span style={styles.price}>${isAnnual ? Math.round(starterAnnual / 12) : starterMonthly}</span>
                <span style={styles.period}>/ month</span>
              </div>
              {isAnnual && <p style={styles.billedAnnually}>Billed ${starterAnnual}/year</p>}
              <ul style={styles.featureList}>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 100 searches/month</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 300 profile unlocks/month</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 300 emails/month</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Filter by roles & expertise</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Advanced developer scoring</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Full GitHub profile access + links</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Save profiles to shortlist</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> One-click outreach</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Email from your domain</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Export candidates</li>
              </ul>
              <Link to="/signup" style={styles.primaryBtn}>Get Started</Link>
            </div>

            {/* Professional - Coming Soon */}
            <div style={{ ...styles.pricingCard, ...styles.comingSoonCard }}>
              <div style={styles.comingSoonBadge}>Coming Soon</div>
              <div style={styles.cardHeader}>
                <div style={styles.planIcon}><Sparkles size={24} color="#6366f1" /></div>
                <h3 style={styles.planName}>Professional</h3>
                <p style={styles.planDesc}>For scaling companies</p>
              </div>
              <div style={styles.priceWrapper}>
                <span style={styles.comingSoonPrice}>Coming Soon</span>
              </div>
              <ul style={styles.featureList}>
                <li style={styles.featureItemMuted}><Check size={18} color="#9ca3af" /> Unlimited profile views</li>
                <li style={styles.featureItemMuted}><Check size={18} color="#9ca3af" /> Unlimited searches</li>
                <li style={styles.featureItemMuted}><Check size={18} color="#9ca3af" /> 500+ emails/month</li>
                <li style={styles.featureItemMuted}><Check size={18} color="#9ca3af" /> Advanced AI scoring</li>
                <li style={styles.featureItemMuted}><Check size={18} color="#9ca3af" /> Priority 24/7 support</li>
                <li style={styles.featureItemMuted}><Check size={18} color="#9ca3af" /> Team collaboration</li>
                <li style={styles.featureItemMuted}><Check size={18} color="#9ca3af" /> Analytics dashboard</li>
                <li style={styles.featureItemMuted}><Check size={18} color="#9ca3af" /> API access</li>
              </ul>
              <button onClick={handleEarlyAccess} style={styles.earlyAccessBtn}>Get Early Access</button>
              <p style={styles.earlyAccessNote}>Be first to know when we launch</p>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={styles.faqSection}>
        <div style={styles.container}>
          <h2 style={styles.faqTitle}>Frequently Asked Questions</h2>
          <div style={styles.faqGrid}>
            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>What happens after my free trial?</h4>
              <p style={styles.faqAnswer}>Your trial data is deleted after 14 days unless you upgrade. No automatic charges.</p>
            </div>
            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>Can I cancel anytime?</h4>
              <p style={styles.faqAnswer}>Yes! Cancel anytime from your dashboard. No questions asked.</p>
            </div>
            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>What are email templates?</h4>
              <p style={styles.faqAnswer}>Pre-built outreach templates you can customize. Starter includes 5 templates.</p>
            </div>
            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>Do you offer refunds?</h4>
              <p style={styles.faqAnswer}>Yes, we offer a 30-day money-back guarantee on all paid plans.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: '#ffffff', fontFamily: "'Outfit', sans-serif" },
  hero: { padding: '4rem 2rem 2rem', background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)', textAlign: 'center' },
  container: { maxWidth: '1100px', margin: '0 auto' },
  title: { fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: '700', color: '#1a1a1a', marginBottom: '1rem' },
  subtitle: { fontSize: '1.25rem', color: '#6b7280', marginBottom: '2rem' },
  
  toggleWrapper: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' },
  toggleLabel: { fontSize: '1rem', fontWeight: '600', transition: 'color 0.2s' },
  toggle: { width: '60px', height: '32px', background: '#FF6B35', borderRadius: '16px', border: 'none', cursor: 'pointer', position: 'relative' },
  toggleKnob: { width: '24px', height: '24px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '4px', transition: 'transform 0.2s' },
  saveBadge: { background: '#dcfce7', color: '#166534', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: '600' },

  pricingSection: { padding: '3rem 2rem 5rem' },
  pricingGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', alignItems: 'start' },
  pricingCard: { background: '#ffffff', border: '2px solid #e5e7eb', borderRadius: '16px', padding: '2rem', position: 'relative' },
  popularCard: { border: '2px solid #FF6B35', boxShadow: '0 8px 32px rgba(255,107,53,0.15)' },
  popularBadge: { position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#FF6B35', color: '#fff', padding: '0.375rem 1rem', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: '600' },
  comingSoonCard: { border: '2px dashed #c7d2fe', background: '#fafafe' },
  comingSoonBadge: { position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: '#fff', padding: '0.375rem 1rem', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: '600' },
  
  cardHeader: { textAlign: 'center', marginBottom: '1.5rem' },
  planIcon: { width: '56px', height: '56px', background: '#fff5f2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' },
  planName: { fontSize: '1.5rem', fontWeight: '700', color: '#1a1a1a', margin: '0 0 0.25rem' },
  planDesc: { fontSize: '0.9375rem', color: '#6b7280', margin: 0 },
  
  priceWrapper: { textAlign: 'center', marginBottom: '0.5rem' },
  price: { fontSize: '3rem', fontWeight: '700', color: '#1a1a1a' },
  period: { fontSize: '1rem', color: '#6b7280' },
  billedAnnually: { fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', margin: '0 0 1rem' },
  comingSoonPrice: { fontSize: '1.5rem', fontWeight: '600', color: '#6366f1' },

  featureList: { listStyle: 'none', padding: 0, margin: '1.5rem 0 2rem' },
  featureItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', fontSize: '0.9375rem', color: '#1a1a1a' },
  featureItemMuted: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', fontSize: '0.9375rem', color: '#9ca3af' },

  trialBtn: { display: 'block', width: '100%', padding: '0.875rem', background: '#ffffff', color: '#FF6B35', border: '2px solid #FF6B35', borderRadius: '10px', textAlign: 'center', textDecoration: 'none', fontWeight: '600', fontSize: '1rem', boxSizing: 'border-box' },
  primaryBtn: { display: 'block', width: '100%', padding: '0.875rem', background: '#FF6B35', color: '#ffffff', border: 'none', borderRadius: '10px', textAlign: 'center', textDecoration: 'none', fontWeight: '600', fontSize: '1rem', boxSizing: 'border-box' },
  earlyAccessBtn: { display: 'block', width: '100%', padding: '0.875rem', background: '#6366f1', color: '#ffffff', border: 'none', borderRadius: '10px', textAlign: 'center', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box' },
  
  noCreditCard: { fontSize: '0.8125rem', color: '#6b7280', textAlign: 'center', marginTop: '0.75rem' },
  earlyAccessNote: { fontSize: '0.8125rem', color: '#6b7280', textAlign: 'center', marginTop: '0.75rem' },

  faqSection: { padding: '4rem 2rem', background: '#f9fafb' },
  faqTitle: { fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '2.5rem' },
  faqGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', maxWidth: '900px', margin: '0 auto' },
  faqItem: { background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb' },
  faqQuestion: { fontSize: '1rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.5rem', margin: '0 0 0.5rem' },
  faqAnswer: { fontSize: '0.9375rem', color: '#6b7280', lineHeight: '1.6', margin: 0 },
};

export default PricingPage;