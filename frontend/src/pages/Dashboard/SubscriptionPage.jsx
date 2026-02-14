import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import EmailSettingsCard from '../../components/EmailSettingsCard';

import { useAuth } from '../../contexts/AuthContext';
import { 
  Mail, Search, Eye, CheckCircle, Loader, AlertCircle, RefreshCw,
  CreditCard, X, History
} from 'lucide-react';
import {
  createPaymentOrder,
  verifyPayment,
  openRazorpayCheckout,
  cancelSubscription,
  getPaymentHistory
} from '../../services/api';

// ============================================
// Plan Card Components
// ============================================

const PlanCardPrice = ({ plan, isAnnual }) => {
  if (plan.comingSoon) {
    return (
      <div style={styles.cardPrice}>
        <span style={styles.comingSoonPrice}>Coming Soon</span>
      </div>
    );
  }

  const price = isAnnual ? Math.round(plan.price_annual / 12) : plan.price_monthly;

  return (
    <>
      <div style={styles.cardPrice}>
        <span style={styles.cardPriceAmount}>${price}</span>
        <span style={styles.cardPriceLabel}>/month</span>
      </div>
      {plan.price_annual > 0 && isAnnual && (
        <div style={styles.annualPrice}>
          Billed ${plan.price_annual}/year (save 17%)
        </div>
      )}
      {plan.period && (
        <div style={styles.noCreditCard}>No credit card required</div>
      )}
    </>
  );
};

const PlanCardButton = ({ plan, currentPlanName, isAnnual, onUpgrade, loading }) => {
  if (plan.comingSoon) {
    return (
      <button onClick={plan.onEarlyAccess} style={styles.earlyAccessBtn}>
        Get Early Access
      </button>
    );
  }

  const isCurrent = currentPlanName?.toLowerCase() === plan.id;
  let label = 'Upgrade Now';
  if (isCurrent) label = 'Current Plan';
  else if (plan.period) label = 'Start Free Trial';

  return (
    <button
      onClick={() => !isCurrent && onUpgrade(plan, isAnnual ? 'annual' : 'monthly')}
      style={{
        ...styles.selectPlanBtn,
        ...(isCurrent ? styles.currentPlanBtn : {}),
        ...(plan.period ? styles.trialBtn : {}),
        ...(loading ? { opacity: 0.7, cursor: 'wait' } : {})
      }}
      disabled={isCurrent || loading}
    >
      {loading ? (
        <>
          <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Processing...
        </>
      ) : label}
    </button>
  );
};

const PlanCard = ({ plan, currentPlanName, isAnnual, onUpgrade, loading }) => {
  const cardStyle = {
    ...styles.planCard,
    ...(plan.popular ? styles.planCardPopular : {}),
    ...(plan.comingSoon ? styles.planCardComingSoon : {}),
    ...(currentPlanName?.toLowerCase() === plan.id ? styles.planCardCurrent : {})
  };

  return (
    <div style={cardStyle}>
      {plan.popular && <div style={styles.popularBadge}>Most Popular</div>}
      {plan.comingSoon && <div style={styles.comingSoonBadge}>Coming Soon</div>}
      <h4 style={styles.cardPlanName}>{plan.name}</h4>
      <PlanCardPrice plan={plan} isAnnual={isAnnual} />
      <div style={styles.featuresList}>
        {plan.features.map((feature, index) => (
          <div key={index} style={{...styles.feature, ...(plan.comingSoon ? {color: '#9ca3af'} : {})}}>
            <CheckCircle size={16} color={plan.comingSoon ? '#9ca3af' : '#10b981'} />
            <span>{feature}</span>
          </div>
        ))}
      </div>
      <PlanCardButton
        plan={plan}
        currentPlanName={currentPlanName}
        isAnnual={isAnnual}
        onUpgrade={onUpgrade}
        loading={loading}
      />
    </div>
  );
};

// ============================================
// Payment Modal Component
// ============================================

const PaymentModal = ({ isOpen, onClose, plan, billingCycle, onSuccess }) => {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [error, setError] = useState(null);
  const { refreshSubscription } = useAuth();

  if (!isOpen) return null;

  const handlePayment = async () => {
    setStatus('loading');
    setError(null);

    try {
      // Step 1: Create order
      const orderData = await createPaymentOrder(plan.id, billingCycle, false);
      
      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create order');
      }

      // Step 2: Open Razorpay checkout
      openRazorpayCheckout(
        orderData,
        // On Success
        async (paymentResponse) => {
          try {
            // Step 3: Verify payment
            const verification = await verifyPayment(
              paymentResponse,
              plan.id,
              billingCycle
            );

            if (verification.success) {
              // Step 4: Refresh subscription data
              await refreshSubscription();
              setStatus('success');
              
              // Close modal after delay
              setTimeout(() => {
                onSuccess();
                onClose();
              }, 2000);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (err) {
            setError(err.message || 'Payment verification failed');
            setStatus('error');
          }
        },
        // On Failure
        (failureData) => {
          setError(failureData.error || 'Payment failed');
          setStatus('error');
        },
        // On Dismiss
        () => {
          setStatus('idle');
        }
      );
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to initiate payment');
      setStatus('error');
    }
  };

  const price = billingCycle === 'annual' ? plan.price_annual : plan.price_monthly;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={onClose}>
          <X size={24} />
        </button>

        {status === 'success' ? (
          <div style={styles.successContent}>
            <div style={styles.successIcon}>
              <CheckCircle size={64} color="#10b981" />
            </div>
            <h3 style={styles.successTitle}>Payment Successful!</h3>
            <p style={styles.successText}>
              Welcome to TalentBox {plan.name}! Your subscription is now active.
            </p>
          </div>
        ) : (
          <>
            <div style={styles.modalHeader}>
              <CreditCard size={32} color="#FF6B35" />
              <h3 style={styles.modalTitle}>Upgrade to {plan.name}</h3>
            </div>

            <div style={styles.orderSummary}>
              <div style={styles.summaryRow}>
                <span>Plan</span>
                <span style={styles.summaryValue}>{plan.name}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Billing</span>
                <span style={styles.summaryValue}>
                  {billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                </span>
              </div>
              <div style={styles.summaryDivider}></div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryTotal}>Total</span>
                <span style={styles.summaryTotalValue}>
                  ${price} {billingCycle === 'annual' ? '/year' : '/month'}
                </span>
              </div>
              {billingCycle === 'annual' && (
                <div style={styles.savingsNote}>
                  You save ${(plan.price_monthly * 12) - plan.price_annual} compared to monthly billing
                </div>
              )}
            </div>

            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div style={styles.modalFeatures}>
              <p style={styles.featuresTitle}>What you'll get:</p>
              {plan.features.slice(0, 5).map((feature, i) => (
                <div key={i} style={styles.featureItem}>
                  <CheckCircle size={14} color="#10b981" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handlePayment}
              disabled={status === 'loading'}
              style={{
                ...styles.payButton,
                opacity: status === 'loading' ? 0.7 : 1
              }}
            >
              {status === 'loading' ? (
                <>
                  <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard size={20} />
                  Pay ${price} Now
                </>
              )}
            </button>

            <p style={styles.secureNote}>
              🔒 Secured by Razorpay. We don't store your card details.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================
// Main Subscription Page Component
// ============================================

// Plan definitions (static, no component state dependency)
const plans = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    price_monthly: 0,
    price_annual: 0,
    period: '14 days',
    features: [
      '25 searches',
      '40 profile unlocks',
      '15 emails',
      'Filter by programming languages',
      'Basic developer scoring',
      'Names & scores visible'
    ]
  },
  {
    id: 'starter',
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
    popular: true
  },
  {
    id: 'professional',
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
    onEarlyAccess: () => {
      const subject = encodeURIComponent('Professional Plan Early Access');
      const body = encodeURIComponent(`Hi TalentBox Team,\n\nI'm interested in getting early access to the Professional plan.\n\nCompany:\nTeam Size:\nCurrent Hiring Needs:\n\nLooking forward to hearing from you!`);
      window.location.href = `mailto:vinay@talentbox.co?subject=${subject}&body=${body}`;
    }
  }
];

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshSubscription, usageStats, fetchUsageStats } = useAuth();

  // State
  const [userData, setUserData] = useState({
    plan: 'Free Trial',
    planId: 'free_trial',
    billing_cycle: 'monthly',
    price: 0,
    subscription_status: 'active',
    trial_end_date: null,
    next_billing_date: null,
    usage: {
      searches: { used: 0, limit: 25 },
      profile_unlocks: { used: 0, limit: 40 },
      emails: { used: 0, limit: 15 },
    }
  });
  const [fetchError, setFetchError] = useState(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState('monthly');
  const [processingPlan] = useState(null);

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Always fetch fresh stats from backend when page mounts
  useEffect(() => {
    fetchUsageStats(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync local UI with usageStats from context (updates on every change)
  useEffect(() => {
    if (!usageStats) return;

    try {
      const planId = usageStats.plan || 'free_trial';
      const planName = (planId === 'free' || planId === 'free_trial') ? 'Free Trial' :
                       planId === 'starter' ? 'Starter' : planId;
      const matchedPlan = plans.find(p => p.id === planId || p.name === planName);

      setUserData({
        plan: planName,
        planId: planId,
        billing_cycle: usageStats.billing_cycle || 'monthly',
        price: matchedPlan?.price_monthly || 0,
        subscription_status: usageStats.subscription_status || 'active',
        trial_end_date: usageStats.trial_end_date,
        next_billing_date: usageStats.next_billing_date || null,
        usage: {
          searches: {
            used: usageStats.searches?.used || 0,
            limit: usageStats.searches?.limit || 25
          },
          profile_unlocks: {
            used: usageStats.profile_unlocks?.used || 0,
            limit: usageStats.profile_unlocks?.limit || 40
          },
          emails: {
            used: usageStats.emails?.used || 0,
            limit: usageStats.emails?.limit || 15
          },
        }
      });
      setFetchError(null);
    } catch (err) {
      console.error('Failed to process usage stats:', err);
      setFetchError('Failed to load subscription data. Please try refreshing the page.');
    }
  }, [usageStats]);

  // Check for URL params (e.g., from pricing page)
  useEffect(() => {
    const planParam = searchParams.get('plan');
    const cycleParam = searchParams.get('cycle');
    const upgradeParam = searchParams.get('upgrade');
    
    if (upgradeParam === 'true' && planParam) {
      const plan = plans.find(p => p.id === planParam.toLowerCase());
      if (plan && !plan.comingSoon) {
        setSelectedPlan(plan);
        setSelectedCycle(cycleParam || 'monthly');
        setShowPaymentModal(true);
      }
    }
  }, [searchParams]);

  // Fetch payment history
  const loadPaymentHistory = async () => {
    try {
      const data = await getPaymentHistory();
      setPaymentHistory(data.payments || []);
    } catch (err) {
      console.error('Failed to load payment history:', err);
    }
  };

  const handleUpgrade = (plan, cycle) => {
    if (plan.period) {
      // Free trial - go to signup
      navigate('/signup');
      return;
    }
    
    setSelectedPlan(plan);
    setSelectedCycle(cycle);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    // Refresh subscription and usage stats from backend
    await refreshSubscription();
    await fetchUsageStats(false);
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const result = await cancelSubscription('User requested cancellation');
      if (result.success) {
        setUserData(prev => ({
          ...prev,
          subscription_status: 'cancelled'
        }));
        setShowCancelModal(false);
        alert(`Your subscription has been cancelled. You will retain access until ${new Date(result.access_until).toLocaleDateString()}.`);
      }
    } catch (err) {
      alert('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setCancelling(false);
    }
  };

  const handleRenew = () => {
    const plan = plans.find(p => p.id === userData.planId);
    if (plan) {
      setSelectedPlan(plan);
      setSelectedCycle(userData.billing_cycle);
      setShowPaymentModal(true);
    }
  };

  const getUsagePercentage = (used, limit) => {
    if (limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage < 60) return '#10b981';
    if (percentage < 80) return '#f59e0b';
    return '#ef4444';
  };

  const handleRefreshUsage = async () => {
    setRefreshing(true);
    try {
      await fetchUsageStats(false);  // Non-silent refresh
    } catch (err) {
      console.error('Failed to refresh usage:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const isTrial = userData.planId === 'free_trial' || userData.planId === 'free';
  const daysUntilBilling = userData.next_billing_date 
    ? Math.ceil((new Date(userData.next_billing_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const showRenewBanner = !isTrial && daysUntilBilling !== null && daysUntilBilling <= 5 && daysUntilBilling > 0;

  return (
    <div style={styles.page}>
      <DashboardHeader
        title="Subscription & Usage"
        subtitle="Manage your plan and track your usage"
      />

      <div style={styles.content}>
        {/* Error State */}
        {fetchError && (
          <div style={styles.errorBanner}>
            <AlertCircle size={20} color="#dc2626" />
            <span>{fetchError}</span>
          </div>
        )}

        {/* Current Plan Card */}
        <div style={styles.currentPlanCard}>
          <div style={styles.planHeader}>
            <div>
              <h3 style={styles.planTitle}>Current Plan: {userData.plan}</h3>
              <p style={styles.planSubtitle}>
                {isTrial
                  ? `Trial ${userData.subscription_status === 'expired' ? 'expired' : 'active'}${userData.trial_end_date ? ` • Ends ${new Date(userData.trial_end_date).toLocaleDateString()}` : ''}`
                  : userData.subscription_status === 'cancelled'
                    ? `Cancelled • Access until ${userData.next_billing_date ? new Date(userData.next_billing_date).toLocaleDateString() : 'end of period'}`
                    : `Billed ${userData.billing_cycle}${userData.next_billing_date ? ` • Next billing: ${new Date(userData.next_billing_date).toLocaleDateString()}` : ''}`
                }
              </p>
            </div>
            <div style={styles.priceBox}>
              <div style={styles.price}>${userData.price}</div>
              <div style={styles.priceLabel}>per month</div>
            </div>
          </div>

          {/* Renew Banner */}
          {showRenewBanner && (
            <div style={styles.renewBanner}>
              <div style={styles.renewBannerContent}>
                <RefreshCw size={20} color="#FF6B35" />
                <div>
                  <strong>Billing coming up!</strong> Your next billing date is {new Date(userData.next_billing_date).toLocaleDateString()}.
                </div>
              </div>
              <button onClick={handleRenew} style={styles.renewBtn}>
                Renew Now
              </button>
            </div>
          )}

          {/* Usage Metrics */}
          <div style={styles.usageSection}>
            <div style={styles.usageHeader}>
              <h4 style={styles.usageTitle}>Usage This {isTrial ? 'Trial' : 'Month'}</h4>
              <button
                onClick={handleRefreshUsage}
                disabled={refreshing}
                style={{
                  ...styles.refreshButton,
                  opacity: refreshing ? 0.6 : 1
                }}
                title="Refresh usage stats"
              >
                <RefreshCw
                  size={16}
                  style={{
                    animation: refreshing ? 'spin 1s linear infinite' : 'none'
                  }}
                />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {/* Searches */}
            <div style={styles.usageItem}>
              <div style={styles.usageItemHeader}>
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
              {userData.usage.searches.used >= userData.usage.searches.limit && (
                <div style={styles.limitReachedMsg}>
                  <AlertCircle size={16} color="#ef4444" />
                  <span>
                    Search limit reached ({userData.usage.searches.used}/{userData.usage.searches.limit}).
                    {userData.next_billing_date
                      ? ` Resets on ${new Date(userData.next_billing_date).toLocaleDateString()}.`
                      : isTrial
                        ? ` Upgrade to get more searches.`
                        : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Unlocks */}
            <div style={styles.usageItem}>
              <div style={styles.usageItemHeader}>
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
              {userData.usage.profile_unlocks.used >= userData.usage.profile_unlocks.limit && (
                <div style={styles.limitReachedMsg}>
                  <AlertCircle size={16} color="#ef4444" />
                  <span>
                    Profile unlock limit reached ({userData.usage.profile_unlocks.used}/{userData.usage.profile_unlocks.limit}).
                    {userData.next_billing_date
                      ? ` Resets on ${new Date(userData.next_billing_date).toLocaleDateString()}.`
                      : isTrial
                        ? ` Upgrade to get more unlocks.`
                        : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Emails */}
            <div style={styles.usageItem}>
              <div style={styles.usageItemHeader}>
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
              {userData.usage.emails.used >= userData.usage.emails.limit && (
                <div style={styles.limitReachedMsg}>
                  <AlertCircle size={16} color="#ef4444" />
                  <span>
                    You've used {userData.usage.emails.used}/{userData.usage.emails.limit} emails.
                    {userData.next_billing_date
                      ? ` Resets on ${new Date(userData.next_billing_date).toLocaleDateString()}.`
                      : isTrial
                        ? ` Upgrade to get more emails.`
                        : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button 
              onClick={() => { loadPaymentHistory(); setShowHistory(!showHistory); }}
              style={styles.historyBtn}
            >
              <History size={18} />
              {showHistory ? 'Hide' : 'View'} Payment History
            </button>
            
            {!isTrial && userData.subscription_status !== 'cancelled' && (
              <button 
                onClick={() => setShowCancelModal(true)}
                style={styles.cancelBtn}
              >
                Cancel Subscription
              </button>
            )}
          </div>

          {/* Payment History */}
          {showHistory && (
            <div style={styles.historySection}>
              <h4 style={styles.historyTitle}>Payment History</h4>
              {paymentHistory.length > 0 ? (
                <div style={styles.historyList}>
                  {paymentHistory.map((payment, idx) => (
                    <div key={idx} style={styles.historyItem}>
                      <div style={styles.historyDetails}>
                        <span style={styles.historyPlan}>{payment.plan} - {payment.billing_cycle}</span>
                        <span style={styles.historyDate}>
                          {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : 'Pending'}
                        </span>
                      </div>
                      <div style={styles.historyAmount}>
                        <span style={{
                          ...styles.historyStatus,
                          color: payment.status === 'captured' ? '#10b981' : 
                                 payment.status === 'failed' ? '#ef4444' : '#f59e0b'
                        }}>
                          {payment.status}
                        </span>
                        <span>${payment.amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={styles.noHistory}>No payment history yet.</p>
              )}
            </div>
          )}
        </div>

        <EmailSettingsCard />
        
        {/* Available Plans */}
        <div style={styles.plansSection}>
          <div style={styles.plansSectionHeader}>
            <div>
              <h3 style={styles.sectionTitle}>
                {isTrial ? 'Upgrade Your Plan' : 'Change Plan'}
              </h3>
              <p style={styles.sectionSubtitle}>Choose the plan that fits your hiring needs</p>
            </div>
            
            {/* Billing Toggle */}
            <div style={styles.billingToggle}>
              <span style={{ ...styles.toggleLabel, color: !isAnnual ? '#1a1a1a' : '#9ca3af' }}>
                Monthly
              </span>
              <button 
                style={styles.toggle} 
                onClick={() => setIsAnnual(!isAnnual)}
              >
                <div style={{ 
                  ...styles.toggleKnob, 
                  transform: isAnnual ? 'translateX(28px)' : 'translateX(4px)' 
                }} />
              </button>
              <span style={{ ...styles.toggleLabel, color: isAnnual ? '#1a1a1a' : '#9ca3af' }}>
                Annual
              </span>
              <span style={styles.saveBadge}>Save 17%</span>
            </div>
          </div>

          <div style={styles.plansGrid}>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentPlanName={userData.planId}
                isAnnual={isAnnual}
                onUpgrade={handleUpgrade}
                loading={processingPlan === plan.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        plan={selectedPlan}
        billingCycle={selectedCycle}
        onSuccess={handlePaymentSuccess}
      />

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCancelModal(false)}>
          <div style={styles.cancelModal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.cancelTitle}>Cancel Subscription?</h3>
            <p style={styles.cancelText}>
              You will retain access to your current plan until the end of your billing period
              {userData.next_billing_date && ` (${new Date(userData.next_billing_date).toLocaleDateString()})`}.
              After that, your account will be downgraded to the free tier.
            </p>
            <div style={styles.cancelActions}>
              <button 
                onClick={() => setShowCancelModal(false)} 
                style={styles.keepPlanBtn}
              >
                Keep My Plan
              </button>
              <button 
                onClick={handleCancelSubscription} 
                disabled={cancelling}
                style={styles.confirmCancelBtn}
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ============================================
// Styles
// ============================================

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

  usageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },

  usageTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
  },

  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    color: '#374151',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },

  usageItem: {
    marginBottom: '1.5rem',
  },

  usageItemHeader: {
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

  actionButtons: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #f3f4f6',
  },

  historyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: '#fff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },

  cancelBtn: {
    padding: '0.75rem 1.25rem',
    background: '#fff',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },

  historySection: {
    marginTop: '2rem',
    padding: '1.5rem',
    background: '#f9fafb',
    borderRadius: '10px',
  },

  historyTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '1rem',
  },

  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },

  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },

  historyDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },

  historyPlan: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  historyDate: {
    fontSize: '0.8125rem',
    color: '#6b7280',
  },

  historyAmount: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  historyStatus: {
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  noHistory: {
    fontSize: '0.9375rem',
    color: '#6b7280',
    textAlign: 'center',
    padding: '1rem',
  },

  plansSection: {
    marginTop: '3rem',
  },

  plansSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
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
  },

  billingToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },

  toggleLabel: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    transition: 'color 0.2s',
  },

  toggle: {
    width: '60px',
    height: '32px',
    background: '#FF6B35',
    borderRadius: '16px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
  },

  toggleKnob: {
    width: '24px',
    height: '24px',
    background: '#fff',
    borderRadius: '50%',
    position: 'absolute',
    top: '4px',
    transition: 'transform 0.2s',
  },

  saveBadge: {
    background: '#dcfce7',
    color: '#166534',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
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

  earlyAccessBtn: {
    width: '100%',
    padding: '0.875rem',
    fontSize: '1rem',
    fontWeight: '600',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    boxSizing: 'border-box',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },

  currentPlanBtn: {
    background: '#e5e7eb',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },

  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '2rem',
    marginBottom: '1rem',
  },

  loadingText: {
    fontSize: '0.9375rem',
    color: '#6b7280',
  },

  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    marginBottom: '1.5rem',
    color: '#dc2626',
    fontSize: '0.9375rem',
    fontWeight: '500',
  },

  renewBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: '10px',
    marginBottom: '1.5rem',
  },

  renewBannerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.9375rem',
    color: '#9a3412',
  },

  renewBtn: {
    padding: '0.625rem 1.25rem',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    whiteSpace: 'nowrap',
  },

  limitReachedMsg: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.5rem',
    padding: '0.625rem 0.875rem',
    background: '#fef2f2',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    color: '#dc2626',
    fontWeight: '500',
  },

  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },

  modal: {
    background: '#fff',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '480px',
    width: '100%',
    position: 'relative',
    maxHeight: '90vh',
    overflowY: 'auto',
  },

  modalClose: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '0.5rem',
  },

  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
  },

  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: 0,
  },

  orderSummary: {
    background: '#f9fafb',
    borderRadius: '10px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
  },

  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    fontSize: '0.9375rem',
    color: '#4b5563',
  },

  summaryValue: {
    fontWeight: '600',
    color: '#1a1a1a',
  },

  summaryDivider: {
    height: '1px',
    background: '#e5e7eb',
    margin: '0.5rem 0',
  },

  summaryTotal: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  summaryTotalValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#FF6B35',
  },

  savingsNote: {
    fontSize: '0.8125rem',
    color: '#10b981',
    textAlign: 'center',
    marginTop: '0.75rem',
    fontWeight: '500',
  },

  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },

  modalFeatures: {
    marginBottom: '1.5rem',
  },

  featuresTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '0.75rem',
  },

  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#4b5563',
    padding: '0.25rem 0',
  },

  payButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '1rem',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1.0625rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },

  secureNote: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: '1rem',
  },

  successContent: {
    textAlign: 'center',
    padding: '2rem 0',
  },

  successIcon: {
    marginBottom: '1.5rem',
  },

  successTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#10b981',
    marginBottom: '0.75rem',
  },

  successText: {
    fontSize: '1rem',
    color: '#4b5563',
    lineHeight: '1.6',
  },

  // Cancel modal
  cancelModal: {
    background: '#fff',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '450px',
    width: '100%',
  },

  cancelTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1rem',
  },

  cancelText: {
    fontSize: '0.9375rem',
    color: '#4b5563',
    lineHeight: '1.6',
    marginBottom: '1.5rem',
  },

  cancelActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
  },

  keepPlanBtn: {
    padding: '0.75rem 1.5rem',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },

  confirmCancelBtn: {
    padding: '0.75rem 1.5rem',
    background: '#fff',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
};

// Hover effects (guarded to prevent duplicate injection)
if (!document.getElementById('subscription-page-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'subscription-page-styles';
  styleSheet.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    button[style*="selectPlanBtn"]:hover:not(:disabled) {
      background: #ff5722 !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255,107,53,0.3);
    }

    button[style*="payButton"]:hover:not(:disabled) {
      background: #ff5722 !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255,107,53,0.3);
    }

    div[style*="planCard"]:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
    }

    button[style*="historyBtn"]:hover {
      background: #f9fafb !important;
    }

    button[style*="cancelBtn"]:hover {
      background: #fef2f2 !important;
    }

    button[style*="refreshButton"]:hover:not(:disabled) {
      background: #f9fafb !important;
      border-color: #9ca3af !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default SubscriptionPage;