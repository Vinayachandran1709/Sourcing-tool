import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { CreditCard, Calendar, TrendingUp, Mail, Search, Eye, CheckCircle, X } from 'lucide-react';
import EmailSettingsCard from '../../components/EmailSettingsCard';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  // Mock user data - replace with real API call
  const [userData, setUserData] = useState({
    plan: 'Starter',
    billing_cycle: 'monthly',
    price: 79,
    next_billing_date: '2025-01-06',
    usage: {
      profile_views: { used: 45, limit: 100 },
      searches: { used: 12, limit: 50 },
      personalized_emails: { used: 8, limit: 20 },
    }
  });

  const plans = [
    {
      name: 'Starter',
      price_monthly: 79,
      price_annual: 790,
      features: [
        '100 profile views/month',
        '50 searches/month',
        '20 AI-personalized emails/month',
        'Basic developer scoring',
        'Email support'
      ],
      limits: {
        profile_views: 100,
        searches: 50,
        personalized_emails: 20
      }
    },
    {
      name: 'Professional',
      price_monthly: 199,
      price_annual: 1990,
      features: [
        '500 profile views/month',
        'Unlimited searches',
        '100 AI-personalized emails/month',
        'Advanced developer scoring',
        'Priority email support',
        'Team collaboration (up to 3 users)'
      ],
      limits: {
        profile_views: 500,
        searches: -1, // unlimited
        personalized_emails: 100
      },
      popular: true
    },
    {
      name: 'Scale',
      price_monthly: 449,
      price_annual: 4490,
      features: [
        'Unlimited profile views',
        'Unlimited searches',
        '500 AI-personalized emails/month',
        'Advanced developer scoring',
        'Dedicated account manager',
        'Team collaboration (unlimited users)',
        'Custom integrations',
        'API access'
      ],
      limits: {
        profile_views: -1,
        searches: -1,
        personalized_emails: 500
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
            
            {/* Profile Views */}
            <div style={styles.usageItem}>
              <div style={styles.usageHeader}>
                <div style={styles.usageLabel}>
                  <Eye size={18} color="#6b7280" />
                  <span>Profile Views</span>
                </div>
                <div style={styles.usageNumbers}>
                  {userData.usage.profile_views.used} / {userData.usage.profile_views.limit}
                </div>
              </div>
              <div style={styles.progressBar}>
                <div 
                  style={{
                    ...styles.progressFill,
                    width: `${getUsagePercentage(userData.usage.profile_views.used, userData.usage.profile_views.limit)}%`,
                    background: getUsageColor(getUsagePercentage(userData.usage.profile_views.used, userData.usage.profile_views.limit))
                  }}
                ></div>
              </div>
            </div>

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

            {/* Personalized Emails */}
            <div style={styles.usageItem}>
              <div style={styles.usageHeader}>
                <div style={styles.usageLabel}>
                  <Mail size={18} color="#6b7280" />
                  <span>AI-Personalized Emails</span>
                </div>
                <div style={styles.usageNumbers}>
                  {userData.usage.personalized_emails.used} / {userData.usage.personalized_emails.limit}
                </div>
              </div>
              <div style={styles.progressBar}>
                <div 
                  style={{
                    ...styles.progressFill,
                    width: `${getUsagePercentage(userData.usage.personalized_emails.used, userData.usage.personalized_emails.limit)}%`,
                    background: getUsageColor(getUsagePercentage(userData.usage.personalized_emails.used, userData.usage.personalized_emails.limit))
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
                  ...(userData.plan === plan.name ? styles.planCardCurrent : {})
                }}
              >
                {plan.popular && (
                  <div style={styles.popularBadge}>Most Popular</div>
                )}
                
                <h4 style={styles.cardPlanName}>{plan.name}</h4>
                
                <div style={styles.cardPrice}>
                  <span style={styles.cardPriceAmount}>${plan.price_monthly}</span>
                  <span style={styles.cardPriceLabel}>/month</span>
                </div>
                
                <div style={styles.annualPrice}>
                  ${plan.price_annual}/year (save 17%)
                </div>

                <div style={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <div key={index} style={styles.feature}>
                      <CheckCircle size={16} color="#10b981" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => {
                    if (userData.plan !== plan.name) {
                      navigate(`/checkout?plan=${plan.name}&cycle=monthly`);
                    }
                  }}
                  style={{
                    ...styles.selectPlanBtn,
                    ...(userData.plan === plan.name ? styles.currentPlanBtn : {})
                  }}
                  disabled={userData.plan === plan.name}
                >
                  {userData.plan === plan.name ? 'Current Plan' : 'Upgrade'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Info */}
        <div style={styles.billingCard}>
          <div style={styles.billingHeader}>
            <CreditCard size={24} color="#FF6B35" />
            <h4 style={styles.billingTitle}>Billing Information</h4>
          </div>
          <div style={styles.billingContent}>
            <div style={styles.billingRow}>
              <span style={styles.billingLabel}>Payment Method</span>
              <span style={styles.billingValue}>•••• •••• •••• 4242</span>
            </div>
            <div style={styles.billingRow}>
              <span style={styles.billingLabel}>Billing Email</span>
              <span style={styles.billingValue}>demo@company.com</span>
            </div>
            <div style={styles.billingRow}>
              <span style={styles.billingLabel}>Next Billing Date</span>
              <span style={styles.billingValue}>{new Date(userData.next_billing_date).toLocaleDateString()}</span>
            </div>
          </div>
          <button style={styles.updateBillingBtn}>Update Billing Info</button>
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

  billingCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
    marginTop: '2rem',
  },

  billingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #f3f4f6',
  },

  billingTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
  },

  billingContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.5rem',
  },

  billingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0',
  },

  billingLabel: {
    fontSize: '0.9375rem',
    color: '#6b7280',
    fontWeight: '500',
  },

  billingValue: {
    fontSize: '0.9375rem',
    color: '#1a1a1a',
    fontWeight: '600',
  },

  updateBillingBtn: {
    padding: '0.75rem 1.5rem',
    fontSize: '0.9375rem',
    fontWeight: '600',
    background: '#fff',
    color: '#1a1a1a',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: "'Outfit', sans-serif",
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
  
  button[style*="updateBillingBtn"]:hover {
    border-color: #FF6B35 !important;
    color: #FF6B35 !important;
  }

  div[style*="planCard"]:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
  }
`;
document.head.appendChild(styleSheet);

export default SubscriptionPage;