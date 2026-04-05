import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Sparkles, Clock, Zap, CreditCard, CheckCircle, Loader, AlertCircle, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { createPaymentOrder, verifyPayment, openRazorpayCheckout } from '../services/api';
import { getDisplayPrices, formatPrice, isIndianUser } from '../utils/currencyUtils';

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user, refreshSubscription } = useAuth();

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState(null);
  const [paymentCycle, setPaymentCycle] = useState('monthly');
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [paymentError, setPaymentError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Currency toggle — default USD, Indian users see a toggle to view INR
  const isIndia = isIndianUser();
  const [showINR, setShowINR] = useState(false);
  const displayPrices = getDisplayPrices(showINR ? 'INR' : 'USD');
  const currency = displayPrices.currency;

  const starterMonthly = displayPrices.starter_monthly;
  const starterAnnual = displayPrices.starter_annual;
  const growthMonthly = displayPrices.growth_monthly;
  const growthAnnual = displayPrices.growth_annual;

  const planPrices = {
    starter: { name: 'Starter', price_monthly: starterMonthly, price_annual: starterAnnual },
    growth: { name: 'Growth', price_monthly: growthMonthly, price_annual: growthAnnual },
  };

  const handleSelectPlan = (planId, cycle) => {
    if (planId === 'free_trial') {
      navigate('/signup');
      return;
    }

    if (isAuthenticated) {
      const plan = planPrices[planId] || planPrices.starter;
      setPaymentPlan({ id: planId, ...plan });
      setPaymentCycle(cycle);
      setPaymentStatus('idle');
      setPaymentError(null);
      setShowPaymentModal(true);
    } else {
      sessionStorage.setItem('intendedPlan', JSON.stringify({ plan: planId, cycle }));
      navigate('/signup');
    }
  };

  const handlePricingPayment = async () => {
    setPaymentStatus('loading');
    setPaymentError(null);

    try {
      const orderData = await createPaymentOrder(paymentPlan.id, paymentCycle, false);
      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create order');
      }

      openRazorpayCheckout(
        orderData,
        async (paymentResponse) => {
          try {
            const verification = await verifyPayment(paymentResponse, paymentPlan.id, paymentCycle);
            if (verification.success) {
              await refreshSubscription();
              setPaymentStatus('success');
              setTimeout(() => {
                setShowPaymentModal(false);
                setPaymentStatus('idle');
              }, 2500);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (err) {
            setPaymentError(err.message || 'Payment verification failed');
            setPaymentStatus('error');
          }
        },
        (failureData) => {
          setPaymentError(failureData.error || 'Payment failed');
          setPaymentStatus('error');
        },
        () => {
          setPaymentStatus('idle');
        }
      );
    } catch (err) {
      setPaymentError(err.message || 'Failed to initiate payment');
      setPaymentStatus('error');
    }
  };

  // Check if user is on a specific plan
  const isCurrentPlan = (planId) => {
    if (!isAuthenticated || !user) return false;
    const userPlan = user.subscription_plan || user.plan;
    return userPlan?.toLowerCase() === planId;
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <section style={styles.hero}>
        <div style={styles.container}>
          <h1 style={styles.title}>Simple, Transparent Pricing</h1>
          <p style={styles.subtitle}>Start free, upgrade when you're ready. No hidden fees.</p>

          {/* Billing Toggle */}
          <div style={styles.toggleWrapper}>
            <span style={{ ...styles.toggleLabel, color: !isAnnual ? '#1a1a1a' : '#9ca3af' }}>Monthly</span>
            <button style={styles.toggle} onClick={() => setIsAnnual(!isAnnual)}>
              <div style={{ ...styles.toggleKnob, transform: isAnnual ? 'translateX(28px)' : 'translateX(4px)' }} />
            </button>
            <span style={{ ...styles.toggleLabel, color: isAnnual ? '#1a1a1a' : '#9ca3af' }}>Annual</span>
            <span style={styles.saveBadge}>Save 17%</span>
          </div>
          {/* Currency Toggle — only shown for Indian users */}
          {isIndia && (
            <div style={styles.currencyToggleWrapper}>
              <span style={{ ...styles.currencyToggleLabel, color: !showINR ? '#1a1a1a' : '#9ca3af' }}>USD ($)</span>
              <button style={styles.currencyToggle} onClick={() => setShowINR(!showINR)}>
                <div style={{ ...styles.currencyToggleKnob, transform: showINR ? 'translateX(20px)' : 'translateX(3px)' }} />
              </button>
              <span style={{ ...styles.currencyToggleLabel, color: showINR ? '#1a1a1a' : '#9ca3af' }}>INR (&#8377;)</span>
            </div>
          )}
          {showINR && (
            <p style={styles.inrNote}>Approximate INR prices shown for reference. Actual payment is processed in INR at the current exchange rate via Razorpay.</p>
          )}
        </div>
      </section>

      <section style={styles.pricingSection}>
        <div style={styles.container}>
          <div style={styles.pricingGrid}>
            
            {/* Free Trial */}
            <div style={{
              ...styles.pricingCard,
              ...(isCurrentPlan('free_trial') || isCurrentPlan('free') ? styles.currentPlanCard : {})
            }}>
              {(isCurrentPlan('free_trial') || isCurrentPlan('free')) && (
                <div style={styles.currentBadge}>Current Plan</div>
              )}
              <div style={styles.cardHeader}>
                <div style={styles.planIcon}><Clock size={24} color="#FF6B35" /></div>
                <h3 style={styles.planName}>Free Trial</h3>
                <p style={styles.planDesc}>Try TalentBox free for 14 days</p>
              </div>
              <div style={styles.priceWrapper}>
                <span style={styles.price}>{currency}0</span>
                <span style={styles.period}>/ 14 days</span>
              </div>
              <ul style={styles.featureList}>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 25 searches</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 50 profile unlocks</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 50 emails</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 5 CSV exports</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 50 saved profiles</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Access to 200,000+ developers</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Quality scores</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Quick filters</li>
              </ul>
              {isCurrentPlan('free_trial') || isCurrentPlan('free') ? (
                <button style={styles.currentPlanBtn} disabled>Current Plan</button>
              ) : (
                <button
                  onClick={() => handleSelectPlan('free_trial', 'monthly')}
                  style={styles.trialBtn}
                >
                  Start Free Trial
                </button>
              )}
              <p style={styles.noCreditCard}>No credit card required</p>
            </div>

            {/* Starter */}
            <div style={{
              ...styles.pricingCard,
              ...styles.popularCard,
              ...(isCurrentPlan('starter') ? styles.currentPlanCard : {})
            }}>
              {isCurrentPlan('starter') ? (
                <div style={styles.currentBadge}>Current Plan</div>
              ) : (
                <div style={styles.popularBadge}>Most Popular</div>
              )}
              <div style={styles.cardHeader}>
                <div style={styles.planIcon}><Zap size={24} color="#FF6B35" /></div>
                <h3 style={styles.planName}>Starter</h3>
                <p style={styles.planDesc}>For individual recruiters</p>
              </div>
              <div style={styles.priceWrapper}>
                <span style={styles.price}>{formatPrice(isAnnual ? Math.round(starterAnnual / 12) : starterMonthly, currency)}</span>
                <span style={styles.period}>/ month</span>
              </div>
              {isAnnual && <p style={styles.billedAnnually}>Billed {formatPrice(starterAnnual, currency)}/year</p>}
              <ul style={styles.featureList}>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 500 searches/month</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 1,000 profile unlocks/month</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 1,000 emails/month</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 50 CSV exports/month</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Unlimited saved profiles</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Access to 200,000+ developers</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> All filters & quick filters</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Quality scores</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Email support</li>
              </ul>
              {isCurrentPlan('starter') ? (
                <button style={styles.currentPlanBtn} disabled>Current Plan</button>
              ) : (
                <button
                  onClick={() => handleSelectPlan('starter', isAnnual ? 'annual' : 'monthly')}
                  style={styles.primaryBtn}
                >
                  {isAuthenticated ? 'Upgrade Now' : 'Get Started'}
                </button>
              )}
            </div>

            {/* Growth */}
            <div style={{
              ...styles.pricingCard,
              ...(isCurrentPlan('growth') ? styles.currentPlanCard : {})
            }}>
              {isCurrentPlan('growth') && (
                <div style={styles.currentBadge}>Current Plan</div>
              )}
              <div style={styles.cardHeader}>
                <div style={styles.planIcon}><Sparkles size={24} color="#FF6B35" /></div>
                <h3 style={styles.planName}>Growth</h3>
                <p style={styles.planDesc}>For teams & agencies</p>
              </div>
              <div style={styles.priceWrapper}>
                <span style={styles.price}>{formatPrice(isAnnual ? Math.round(growthAnnual / 12) : growthMonthly, currency)}</span>
                <span style={styles.period}>/ month</span>
              </div>
              {isAnnual && <p style={styles.billedAnnually}>Billed {formatPrice(growthAnnual, currency)}/year</p>}
              <ul style={styles.featureList}>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Unlimited searches</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 3,000 profile unlocks/month</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> 3,000 emails/month</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Unlimited CSV exports</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Unlimited saved profiles</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Access to 200,000+ developers</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> All filters & quick filters</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Advanced quality scores</li>
                <li style={styles.featureItem}><Check size={18} color="#10b981" /> Priority support</li>
              </ul>
              {isCurrentPlan('growth') ? (
                <button style={styles.currentPlanBtn} disabled>Current Plan</button>
              ) : (
                <button
                  onClick={() => handleSelectPlan('growth', isAnnual ? 'annual' : 'monthly')}
                  style={styles.primaryBtn}
                >
                  {isAuthenticated ? 'Upgrade Now' : 'Get Growth'}
                </button>
              )}
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
              <p style={styles.faqAnswer}>Your trial data is preserved for 7 days after expiration. Upgrade anytime to continue where you left off. No automatic charges.</p>
            </div>
            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>Can I cancel anytime?</h4>
              <p style={styles.faqAnswer}>Yes! Cancel anytime from your dashboard. You'll retain access until the end of your billing period. No questions asked.</p>
            </div>
            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>What payment methods do you accept?</h4>
              <p style={styles.faqAnswer}>We accept all major credit cards, debit cards, UPI, and net banking through our secure payment partner Razorpay.</p>
            </div>
            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>Do you offer refunds?</h4>
              <p style={styles.faqAnswer}>Yes, we offer a 14-day money-back guarantee on all paid plans. No questions asked.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA for logged-in users */}
      {isAuthenticated && (
        <section style={styles.ctaSection}>
          <div style={styles.container}>
            <div style={styles.ctaCard}>
              <h3 style={styles.ctaTitle}>Ready to upgrade?</h3>
              <p style={styles.ctaText}>
                Go to your subscription page to manage your plan and complete your upgrade.
              </p>
              <Link to="/dashboard/subscription" style={styles.ctaBtn}>
                Go to Subscription
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Inline Payment Modal */}
      {showPaymentModal && paymentPlan && (
        <div style={styles.modalOverlay} onClick={() => { if (paymentStatus !== 'loading') setShowPaymentModal(false); }}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => { if (paymentStatus !== 'loading') setShowPaymentModal(false); }}>
              <X size={24} />
            </button>

            {paymentStatus === 'success' ? (
              <div style={styles.successContent}>
                <CheckCircle size={64} color="#10b981" />
                <h3 style={styles.successTitle}>Payment Successful!</h3>
                <p style={styles.successText}>
                  Welcome to TalentBox {paymentPlan.name}! Your subscription is now active.
                </p>
              </div>
            ) : (
              <>
                <div style={styles.modalHeader}>
                  <CreditCard size={32} color="#FF6B35" />
                  <h3 style={styles.modalTitle}>Upgrade to {paymentPlan.name}</h3>
                </div>

                <div style={styles.orderSummary}>
                  <div style={styles.summaryRow}>
                    <span>Plan</span>
                    <span style={styles.summaryValue}>{paymentPlan.name}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span>Billing</span>
                    <span style={styles.summaryValue}>{paymentCycle === 'annual' ? 'Annual' : 'Monthly'}</span>
                  </div>
                  <div style={styles.summaryDivider}></div>
                  <div style={styles.summaryRow}>
                    <span style={{ fontWeight: '600' }}>Total</span>
                    <span style={styles.summaryTotal}>
                      {formatPrice(paymentCycle === 'annual' ? paymentPlan.price_annual : paymentPlan.price_monthly, currency)} {paymentCycle === 'annual' ? '/year' : '/month'}
                    </span>
                  </div>
                </div>

                {paymentError && (
                  <div style={styles.errorBox}>
                    <AlertCircle size={18} />
                    <span>{paymentError}</span>
                  </div>
                )}

                <button
                  onClick={handlePricingPayment}
                  disabled={paymentStatus === 'loading'}
                  style={{ ...styles.payButton, opacity: paymentStatus === 'loading' ? 0.7 : 1 }}
                >
                  {paymentStatus === 'loading' ? (
                    <><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                  ) : (
                    <><CreditCard size={20} /> Pay {formatPrice(paymentCycle === 'annual' ? paymentPlan.price_annual : paymentPlan.price_monthly, currency)} Now</>
                  )}
                </button>
                <p style={styles.secureNote}>Secured by Razorpay. We don't store your card details.</p>
              </>
            )}
          </div>
        </div>
      )}

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
  currencyToggleWrapper: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' },
  currencyToggleLabel: { fontSize: '0.875rem', fontWeight: '600', transition: 'color 0.2s' },
  currencyToggle: { width: '44px', height: '24px', background: '#d1d5db', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative' },
  currencyToggleKnob: { width: '18px', height: '18px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '3px', transition: 'transform 0.2s' },
  inrNote: { fontSize: '0.8125rem', color: '#6b7280', textAlign: 'center', marginTop: '0.75rem', maxWidth: '500px', margin: '0.75rem auto 0' },

  pricingSection: { padding: '3rem 2rem 5rem' },
  pricingGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', alignItems: 'start' },
  pricingCard: { background: '#ffffff', border: '2px solid #e5e7eb', borderRadius: '16px', padding: '2rem', position: 'relative', transition: 'all 0.3s' },
  popularCard: { border: '2px solid #FF6B35', boxShadow: '0 8px 32px rgba(255,107,53,0.15)' },
  currentPlanCard: { background: '#fff5f2', borderColor: '#FF6B35' },
  popularBadge: { position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#FF6B35', color: '#fff', padding: '0.375rem 1rem', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: '600' },
  currentBadge: { position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#10b981', color: '#fff', padding: '0.375rem 1rem', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: '600' },
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

  trialBtn: { display: 'block', width: '100%', padding: '0.875rem', background: '#ffffff', color: '#FF6B35', border: '2px solid #FF6B35', borderRadius: '10px', textAlign: 'center', textDecoration: 'none', fontWeight: '600', fontSize: '1rem', boxSizing: 'border-box', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  primaryBtn: { display: 'block', width: '100%', padding: '0.875rem', background: '#FF6B35', color: '#ffffff', border: 'none', borderRadius: '10px', textAlign: 'center', textDecoration: 'none', fontWeight: '600', fontSize: '1rem', boxSizing: 'border-box', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  currentPlanBtn: { display: 'block', width: '100%', padding: '0.875rem', background: '#e5e7eb', color: '#9ca3af', border: 'none', borderRadius: '10px', textAlign: 'center', fontWeight: '600', fontSize: '1rem', boxSizing: 'border-box', cursor: 'not-allowed', fontFamily: "'Outfit', sans-serif" },
  earlyAccessBtn: { display: 'block', width: '100%', padding: '0.875rem', background: '#6366f1', color: '#ffffff', border: 'none', borderRadius: '10px', textAlign: 'center', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box' },
  
  noCreditCard: { fontSize: '0.8125rem', color: '#6b7280', textAlign: 'center', marginTop: '0.75rem' },
  earlyAccessNote: { fontSize: '0.8125rem', color: '#6b7280', textAlign: 'center', marginTop: '0.75rem' },

  faqSection: { padding: '4rem 2rem', background: '#f9fafb' },
  faqTitle: { fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '2.5rem' },
  faqGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', maxWidth: '900px', margin: '0 auto' },
  faqItem: { background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb' },
  faqQuestion: { fontSize: '1rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.5rem', margin: '0 0 0.5rem' },
  faqAnswer: { fontSize: '0.9375rem', color: '#6b7280', lineHeight: '1.6', margin: 0 },

  ctaSection: { padding: '3rem 2rem', background: '#ffffff' },
  ctaCard: { background: 'linear-gradient(135deg, #FF6B35 0%, #ff8a65 100%)', borderRadius: '16px', padding: '2.5rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' },
  ctaTitle: { fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '0.75rem' },
  ctaText: { fontSize: '1rem', color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem', lineHeight: '1.6' },
  ctaBtn: { display: 'inline-block', padding: '0.875rem 2rem', background: '#fff', color: '#FF6B35', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '1rem' },

  // Payment modal styles
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { background: '#fff', borderRadius: '16px', padding: '2rem', maxWidth: '480px', width: '100%', position: 'relative', maxHeight: '90vh', overflowY: 'auto' },
  modalClose: { position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '0.5rem' },
  modalHeader: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' },
  modalTitle: { fontSize: '1.5rem', fontWeight: '700', color: '#1a1a1a', margin: 0 },
  orderSummary: { background: '#f9fafb', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', fontSize: '0.9375rem', color: '#4b5563' },
  summaryValue: { fontWeight: '600', color: '#1a1a1a' },
  summaryDivider: { height: '1px', background: '#e5e7eb', margin: '0.5rem 0' },
  summaryTotal: { fontSize: '1.25rem', fontWeight: '700', color: '#FF6B35' },
  errorBox: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' },
  payButton: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1.0625rem', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  secureNote: { fontSize: '0.8125rem', color: '#6b7280', textAlign: 'center', marginTop: '1rem' },
  successContent: { textAlign: 'center', padding: '2rem 0' },
  successTitle: { fontSize: '1.75rem', fontWeight: '700', color: '#10b981', marginBottom: '0.75rem' },
  successText: { fontSize: '1rem', color: '#4b5563', lineHeight: '1.6' },
};

// Responsive styles
if (!document.getElementById('pricing-page-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'pricing-page-styles';
  styleSheet.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 1024px) {
      div[style*="pricingGrid"] {
        grid-template-columns: 1fr !important;
        max-width: 450px !important;
        margin: 0 auto !important;
      }
    }

    @media (max-width: 768px) {
      div[style*="faqGrid"] {
        grid-template-columns: 1fr !important;
      }
    }

    button[style*="primaryBtn"]:hover,
    button[style*="trialBtn"]:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255,107,53,0.3);
    }

    button[style*="earlyAccessBtn"]:hover {
      background: #4f46e5 !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default PricingPage;