import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { CheckCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState('monthly'); // monthly or annual

  const plans = [
    {
      name: 'Starter',
      price_monthly: 79,
      price_annual: 790,
      description: 'Perfect for small teams getting started',
      features: [
        '100 profile views/month',
        '50 searches/month',
        '20 AI-personalized emails/month',
        'Basic developer scoring',
        'Email support',
        'Search history',
        'Outreach tracking'
      ],
      notIncluded: [
        'Team collaboration',
        'API access',
        'Custom integrations',
        'Dedicated account manager'
      ]
    },
    {
      name: 'Professional',
      price_monthly: 199,
      price_annual: 1990,
      description: 'For growing teams hiring regularly',
      features: [
        '500 profile views/month',
        'Unlimited searches',
        '100 AI-personalized emails/month',
        'Advanced developer scoring',
        'Priority email support',
        'Team collaboration (up to 3 users)',
        'Advanced analytics',
        'Search history',
        'Outreach tracking'
      ],
      notIncluded: [
        'API access',
        'Custom integrations',
        'Dedicated account manager'
      ],
      popular: true
    },
    {
      name: 'Scale',
      price_monthly: 449,
      price_annual: 4490,
      description: 'For enterprises with high-volume hiring',
      features: [
        'Unlimited profile views',
        'Unlimited searches',
        '500 AI-personalized emails/month',
        'Advanced developer scoring',
        'Dedicated account manager',
        'Team collaboration (unlimited users)',
        'Custom integrations',
        'API access',
        'Advanced analytics',
        'Priority support (24/7)',
        'Custom training & onboarding'
      ],
      notIncluded: []
    }
  ];

  const getPrice = (plan) => {
    return billingCycle === 'monthly' ? plan.price_monthly : Math.floor(plan.price_annual / 12);
  };

  const getSavings = () => {
    return billingCycle === 'annual' ? '17% savings' : null;
  };

  return (
    <div style={styles.page}>
      <Navbar />

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.container}>
          <h1 style={styles.title}>Simple, Transparent Pricing</h1>
          <p style={styles.subtitle}>
            Choose the plan that fits your hiring needs. Cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div style={styles.billingToggle}>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                ...styles.toggleBtn,
                ...(billingCycle === 'monthly' ? styles.toggleBtnActive : {})
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              style={{
                ...styles.toggleBtn,
                ...(billingCycle === 'annual' ? styles.toggleBtnActive : {})
              }}
            >
              Annual
              {getSavings() && <span style={styles.savingsBadge}>Save 17%</span>}
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section style={styles.pricingSection}>
        <div style={styles.container}>
          <div style={styles.plansGrid}>
            {plans.map((plan) => (
              <div 
                key={plan.name}
                style={{
                  ...styles.planCard,
                  ...(plan.popular ? styles.planCardPopular : {})
                }}
              >
                {plan.popular && (
                  <div style={styles.popularBadge}>Most Popular</div>
                )}

                <div style={styles.planHeader}>
                  <h3 style={styles.planName}>{plan.name}</h3>
                  <p style={styles.planDescription}>{plan.description}</p>
                </div>

                <div style={styles.planPrice}>
                  <span style={styles.currency}>$</span>
                  <span style={styles.amount}>{getPrice(plan)}</span>
                  <span style={styles.period}>/month</span>
                </div>

                {billingCycle === 'annual' && (
                  <p style={styles.billedAnnually}>
                    Billed annually at ${plan.price_annual}
                  </p>
                )}

                <Link to="/signup" style={styles.selectButton}>
                  Get Started
                </Link>

                <div style={styles.featuresSection}>
                  <p style={styles.featuresTitle}>What's included:</p>
                  <ul style={styles.featuresList}>
                    {plan.features.map((feature, index) => (
                      <li key={index} style={styles.featureItem}>
                        <CheckCircle size={18} color="#10b981" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.notIncluded.length > 0 && (
                    <ul style={styles.featuresList}>
                      {plan.notIncluded.map((feature, index) => (
                        <li key={index} style={styles.featureItemDisabled}>
                          <X size={18} color="#d1d5db" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={styles.faqSection}>
        <div style={styles.container}>
          <h2 style={styles.faqTitle}>Frequently Asked Questions</h2>
          
          <div style={styles.faqGrid}>
            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>Can I change plans later?</h4>
              <p style={styles.faqAnswer}>
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>

            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>What happens when I hit my limits?</h4>
              <p style={styles.faqAnswer}>
                You'll receive a notification when you're close to your limits. You can upgrade anytime or wait until next billing cycle.
              </p>
            </div>

            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>Do you offer refunds?</h4>
              <p style={styles.faqAnswer}>
                Yes, we offer a 14-day money-back guarantee. If you're not satisfied, contact us for a full refund.
              </p>
            </div>

            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>Can I cancel anytime?</h4>
              <p style={styles.faqAnswer}>
                Absolutely. No long-term contracts. Cancel anytime from your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#ffffff',
    fontFamily: "'Outfit', sans-serif",
  },

  hero: {
    padding: '4rem 2rem 3rem',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
    textAlign: 'center',
  },

  container: {
    maxWidth: '1400px',
    margin: '0 auto',
  },

  title: {
    fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1rem',
  },

  subtitle: {
    fontSize: '1.25rem',
    color: '#6b7280',
    marginBottom: '3rem',
  },

  billingToggle: {
    display: 'inline-flex',
    gap: '0.5rem',
    padding: '0.375rem',
    background: '#f3f4f6',
    borderRadius: '12px',
  },

  toggleBtn: {
    position: 'relative',
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    fontWeight: '600',
    background: 'transparent',
    color: '#6b7280',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: "'Outfit', sans-serif",
  },

  toggleBtnActive: {
    background: '#ffffff',
    color: '#1a1a1a',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },

  savingsBadge: {
    marginLeft: '0.5rem',
    padding: '0.25rem 0.5rem',
    background: '#10b981',
    color: '#fff',
    fontSize: '0.75rem',
    borderRadius: '4px',
    fontWeight: '700',
  },

  pricingSection: {
    padding: '4rem 2rem',
  },

  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '2rem',
  },

  planCard: {
    position: 'relative',
    padding: '2.5rem',
    background: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '16px',
    transition: 'all 0.3s',
  },

  planCardPopular: {
    borderColor: '#FF6B35',
    transform: 'scale(1.05)',
    boxShadow: '0 12px 40px rgba(255,107,53,0.15)',
  },

  popularBadge: {
    position: 'absolute',
    top: '-14px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '0.5rem 1.5rem',
    background: '#FF6B35',
    color: '#fff',
    fontSize: '0.8125rem',
    fontWeight: '700',
    borderRadius: '20px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  planHeader: {
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #f3f4f6',
  },

  planName: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '0.5rem',
  },

  planDescription: {
    fontSize: '0.9375rem',
    color: '#6b7280',
  },

  planPrice: {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: '0.5rem',
  },

  currency: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  amount: {
    fontSize: '3.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 1,
  },

  period: {
    fontSize: '1.125rem',
    color: '#6b7280',
    marginLeft: '0.5rem',
  },

  billedAnnually: {
    fontSize: '0.875rem',
    color: '#10b981',
    fontWeight: '600',
    marginBottom: '1.5rem',
  },

  selectButton: {
    display: 'block',
    width: '100%',
    padding: '1rem',
    fontSize: '1.0625rem',
    fontWeight: '600',
    background: '#FF6B35',
    color: '#fff',
    textAlign: 'center',
    textDecoration: 'none',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '2rem',
  },

  featuresSection: {
    paddingTop: '1.5rem',
    borderTop: '1px solid #f3f4f6',
  },

  featuresTitle: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '1rem',
  },

  featuresList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
  },

  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.9375rem',
    color: '#1a1a1a',
  },

  featureItemDisabled: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.9375rem',
    color: '#9ca3af',
  },

  faqSection: {
    padding: '4rem 2rem',
    background: '#f9fafb',
  },

  faqTitle: {
    fontSize: 'clamp(2rem, 4vw, 2.5rem)',
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: '3rem',
  },

  faqGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
  },

  faqItem: {
    padding: '1.5rem',
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },

  faqQuestion: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.75rem',
  },

  faqAnswer: {
    fontSize: '0.9375rem',
    color: '#6b7280',
    lineHeight: '1.7',
  },
};

// Hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  a[style*="selectButton"]:hover {
    background: #ff5722 !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(255,107,53,0.3);
  }
  
  div[style*="planCard"]:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 48px rgba(0,0,0,0.12) !important;
  }
`;
document.head.appendChild(styleSheet);

export default PricingPage;