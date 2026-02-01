import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { Mail, Search, Eye, CheckCircle } from 'lucide-react';
import EmailSettingsCard from '../../components/EmailSettingsCard';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  // Mock user data - replace with real API call
  const [userData] = useState({
    plan: 'Starter',
    billing_cycle: 'monthly',
    price: 79,
    next_billing_date: '2025-01-06',
    usage: {
      profile_unlocks: { used: 45, limit: 300 },
      searches: { used: 12, limit: 100 },
      emails: { used: 8, limit: 300 },
    }
  });

  const plans = [
    {
      name: 'Free Trial',
      price_monthly: 0,
      price_annual: 0,
      period: '14 days',
      features: [
        '25 searches',
        '40 profile unlocks',
        '30 emails',
        'Filter by programming languages',
        'Basic developer scoring',
        'Names & scores visible'
      ],
      limits: {
        profile_unlocks: 40,
        searches: 25,
        emails: 30
      }
    },
    {
      name: 'Starter',
      price_monthly: 79,
      price_annual: 790,
      features: [
        '100 searches/month',
        '300 profile unlocks/month',
        '300 emails/month',
        'Filter by roles & expertise',
        'Advanced developer scoring',
        'Full GitHub profile access + links',
        'Save profiles to shortlist',
        'One-click outreach',
        'Email from your domain'
      ],
      limits: {
        profile_unlocks: 300,
        searches: 100,
        emails: 300
      },
      popular: true
    },
    {
      name: 'Professional',
      price_monthly: null,
      price_annual: null,
      comingSoon: true,
      features: [
        'Unlimited profile views',
        'Unlimited searches',
        '500+ emails/month',
        'Advanced AI scoring',
        'Priority 24/7 support',
        'Team collaboration',
        'Analytics dashboard',
        'API access'
      ],
      limits: {
        profile_unlocks: -1,
        searches: -1,
        emails: 500
      }
    }
  ];

  const getUsagePercentage = (used, limit) => {
    if (limit === -1) return 0; // unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage < 60) return '#10b981'; // green
    if (percentage < 80) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div style={styles.page}>
      <DashboardHeader 
        title="Subscription & Usage" 
        subtitle="Manage your plan and track your usage"
      />

      <div style={styles.content}>
        {/* Current Plan Card */}
        <div style={styles.currentPlanCard}>
          <div style={styles.planHeader}>
            <div>
              <h3 style={styles.planTitle}>Current Plan: {userData.plan}</h3>
              <p style={styles.planSubtitle}>
                Billed {userData.billing_cycle} • Next billing on {new Date(userData.next_billing_date).toLocaleDateString()}
              </p>
            </div>
            <div style={styles.priceBox}>
              <div style={styles.price}>${userData.price}</div>
              <div style={styles.priceLabel}>per month</div>
            </div>
          </div>

          {/* Usage Metrics */}
          <div style={styles.usageSection}>
            <h4 style={styles.usageTitle}>Usage This Month</h4>
            
            {/* Searches */}
            <div style={styles.usageItem}>
              <div style={styles.usageHeader}>
                <div style={styles.usageLabel}>
                  <Search size={18} color="#6b7280" />
                  <span>Searches</span>
                </div>
                <div style={styles.usageNumbers}>
                  {userData.usage.searches.used} / {userData.usage.searches.limit}
                </div>
              </div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${getUsagePercentage(userData.usage.searches.used, userData.usage.searches.limit)}%`,
                    background: getUsageColor(getUsagePercentage(userData.usage.searches.used, userData.usage.searches.limit))
                  }}
                ></div>
              </div>
            </div>

            {/* Profile Unlocks */}
            <div style={styles.usageItem}>
              <div style={styles.usageHeader}>
                <div style={styles.usageLabel}>
                  <Eye size={18} color="#6b7280" />
                  <span>Profile Unlocks</span>
                </div>
                <div style={styles.usageNumbers}>
                  {userData.usage.profile_unlocks.used} / {userData.usage.profile_unlocks.limit}
                </div>
              </div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${getUsagePercentage(userData.usage.profile_unlocks.used, userData.usage.profile_unlocks.limit)}%`,
                    background: getUsageColor(getUsagePercentage(userData.usage.profile_unlocks.used, userData.usage.profile_unlocks.limit))
                  }}
                ></div>
              </div>
            </div>

            {/* Emails */}
            <div style={styles.usageItem}>
              <div style={styles.usageHeader}>
                <div style={styles.usageLabel}>
                  <Mail size={18} color="#6b7280" />
                  <span>Emails</span>
                </div>
                <div style={styles.usageNumbers}>
                  {userData.usage.emails.used} / {userData.usage.emails.limit}
                </div>
              </div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${getUsagePercentage(userData.usage.emails.used, userData.usage.emails.limit)}%`,
                    background: getUsageColor(getUsagePercentage(userData.usage.emails.used, userData.usage.emails.limit))
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <EmailSettingsCard />
        
        {/* Available Plans */}
        <div style={styles.plansSection}>
          <h3 style={styles.sectionTitle}>Upgrade Your Plan</h3>
          <p style={styles.sectionSubtitle}>Choose the plan that fits your hiring needs</p>

          <div style={styles.plansGrid}>
            {plans.map((plan) => (
              <div
                key={plan.name}
                style={{
                  ...styles.planCard,
                  ...(plan.popular ? styles.planCardPopular : {}),
                  ...(plan.comingSoon ? styles.planCardComingSoon : {}),
                  ...(userData.plan === plan.name ? styles.planCardCurrent : {})
                }}
              >
                {plan.popular && (
                  <div style={styles.popularBadge}>Most Popular</div>
                )}
                {plan.comingSoon && (
                  <div style={styles.comingSoonBadge}>Coming Soon</div>
                )}

                <h4 style={styles.cardPlanName}>{plan.name}</h4>

                {plan.comingSoon ? (
                  <div style={styles.cardPrice}>
                    <span style={styles.comingSoonPrice}>Coming Soon</span>
                  </div>
                ) : (
                  <>
                    <div style={styles.cardPrice}>
                      <span style={styles.cardPriceAmount}>${plan.price_monthly}</span>
                      <span style={styles.cardPriceLabel}>{plan.period ? `/ ${plan.period}` : '/month'}</span>
                    </div>
                    {plan.price_annual > 0 && (
                      <div style={styles.annualPrice}>
                        ${plan.price_annual}/year (save 17%)
                      </div>
                    )}
                    {plan.period && (
                      <div style={styles.noCreditCard}>No credit card required</div>
                    )}
                  </>
                )}

                <div style={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <div key={index} style={{...styles.feature, ...(plan.comingSoon ? {color: '#9ca3af'} : {})}}>
                      <CheckCircle size={16} color={plan.comingSoon ? '#9ca3af' : '#10b981'} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {plan.comingSoon ? (
                  <button style={styles.comingSoonBtn} disabled>Coming Soon</button>
                ) : (
                  <button
                    onClick={() => {
                      if (userData.plan !== plan.name) {
                        if (plan.period) {
                          navigate('/signup');
                        } else {
                          navigate(`/checkout?plan=${plan.name}&cycle=monthly`);
                        }
                      }
                    }}
                    style={{
                      ...styles.selectPlanBtn,
                      ...(userData.plan === plan.name ? styles.currentPlanBtn : {}),
                      ...(plan.period ? styles.trialBtn : {})
                    }}
                    disabled={userData.plan === plan.name}
                  >
                    {userData.plan === plan.name ? 'Current Plan' : plan.period ? 'Start Free Trial' : 'Upgrade'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
  },

  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
  },

  currentPlanCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '2rem',
  },

  planHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #f3f4f6',
  },

  planTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: 0,
  },

  planSubtitle: {
    fontSize: '0.9375rem',
    color: '#6b7280',
    marginTop: '0.375rem',
  },

  priceBox: {
    textAlign: 'right',
  },

  price: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#FF6B35',
    lineHeight: 1,
  },

  priceLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },

  usageSection: {
    marginTop: '1.5rem',
  },

  usageTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '1.5rem',
  },

  usageItem: {
    marginBottom: '1.5rem',
  },

  usageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },

  usageLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9375rem',
    fontWeight: '500',
    color: '#1a1a1a',
  },

  usageNumbers: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
  },

  progressBar: {
    height: '8px',
    background: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'all 0.3s ease',
  },

  plansSection: {
    marginTop: '3rem',
  },

  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '0.5rem',
  },

  sectionSubtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '2rem',
  },

  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem',
  },

  planCard: {
    background: '#fff',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
    position: 'relative',
    transition: 'all 0.3s',
  },

  planCardPopular: {
    borderColor: '#FF6B35',
    boxShadow: '0 4px 16px rgba(255,107,53,0.15)',
  },

  planCardCurrent: {
    background: '#fff5f2',
    borderColor: '#FF6B35',
  },

  popularBadge: {
    position: 'absolute',
    top: '-12px',
    right: '1.5rem',
    padding: '0.375rem 0.875rem',
    background: '#FF6B35',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: '700',
    borderRadius: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  cardPlanName: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1rem',
  },

  cardPrice: {
    marginBottom: '0.5rem',
  },

  cardPriceAmount: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
  },

  cardPriceLabel: {
    fontSize: '1rem',
    color: '#6b7280',
  },

  annualPrice: {
    fontSize: '0.875rem',
    color: '#10b981',
    fontWeight: '600',
    marginBottom: '1.5rem',
  },

  noCreditCard: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    marginBottom: '1.5rem',
  },

  planCardComingSoon: {
    border: '2px dashed #c7d2fe',
    background: '#fafafe',
  },

  comingSoonBadge: {
    position: 'absolute',
    top: '-12px',
    right: '1.5rem',
    padding: '0.375rem 0.875rem',
    background: '#6366f1',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: '700',
    borderRadius: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  comingSoonPrice: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#6366f1',
  },

  comingSoonBtn: {
    width: '100%',
    padding: '0.875rem',
    fontSize: '1rem',
    fontWeight: '600',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'not-allowed',
    opacity: 0.7,
    fontFamily: "'Outfit', sans-serif",
  },

  trialBtn: {
    background: '#ffffff',
    color: '#FF6B35',
    border: '2px solid #FF6B35',
  },

  featuresList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },

  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.9375rem',
    color: '#4b5563',
  },

  selectPlanBtn: {
    width: '100%',
    padding: '0.875rem',
    fontSize: '1rem',
    fontWeight: '600',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: "'Outfit', sans-serif",
  },

  currentPlanBtn: {
    background: '#e5e7eb',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },

};

// Add hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  button[style*="selectPlanBtn"]:hover:not(:disabled) {
    background: #ff5722 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255,107,53,0.3);
  }
  
  div[style*="planCard"]:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
  }
`;
document.head.appendChild(styleSheet);

export default SubscriptionPage;