import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Package, Check, ArrowLeft, CreditCard, Shield, Zap } from 'lucide-react';
import { createRazorpayOrder, openRazorpayCheckout, verifyRazorpayPayment } from '../services/razorpay';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get plan details from URL parameters
  const planName = searchParams.get('plan') || 'Starter';
  const billingCycle = searchParams.get('cycle') || 'monthly';

  // Plan pricing data
  const plans = {
    Starter: { monthly: 79, annual: 790 },
    Professional: { monthly: 199, annual: 1990 },
    Scale: { monthly: 449, annual: 4490 },
  };

  const planFeatures = {
    Starter: [
      '100 profile views/month',
      '50 searches/month',
      '20 AI-personalized emails/month',
      'Basic developer scoring',
      'Email support',
    ],
    Professional: [
      '500 profile views/month',
      'Unlimited searches',
      '100 AI-personalized emails/month',
      'Advanced developer scoring',
      'Priority email support',
      'Team collaboration (up to 3 users)',
    ],
    Scale: [
      'Unlimited profile views',
      'Unlimited searches',
      '500 AI-personalized emails/month',
      'Advanced developer scoring',
      'Dedicated account manager',
      'Team collaboration (unlimited users)',
      'Custom integrations',
      'API access',
    ],
  };

  const price = plans[planName]?.[billingCycle] || 79;
  const features = planFeatures[planName] || planFeatures.Starter;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Step 1: Create order on backend
      const orderData = await createRazorpayOrder({
        plan_name: planName,
        billing_cycle: billingCycle,
        amount: price,
        currency: 'INR',
      });

      // Step 2: Open Razorpay checkout
      openRazorpayCheckout(
        {
          amount: orderData.amount, // Amount in paise
          currency: orderData.currency,
          orderId: orderData.order_id,
          description: `${planName} Plan - ${billingCycle}`,
          planName: planName,
          billingCycle: billingCycle,
          userDetails: {
            name: user?.name,
            email: user?.email,
            phone: user?.phone || '',
          },
        },
        // Success callback
        async (paymentResponse) => {
          try {
            // Step 3: Verify payment on backend
            const verificationResult = await verifyRazorpayPayment({
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
              plan_name: planName,
              billing_cycle: billingCycle,
            });

            // Update user subscription in context
            updateUser({
              subscription_plan: planName.toLowerCase(),
              billing_cycle: billingCycle,
            });

            // Redirect to success page
            navigate(`/payment-success?payment_id=${paymentResponse.razorpay_payment_id}&plan=${planName}`);
          } catch (err) {
            console.error('Payment verification failed:', err);
            setError('Payment verification failed. Please contact support.');
            setLoading(false);
          }
        },
        // Failure callback
        (error) => {
          console.error('Payment failed:', error);
          setError(error.message || 'Payment failed. Please try again.');
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Order creation failed:', err);
      setError(err.message || 'Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <Package size={32} color="#FF6B35" />
            <span style={styles.logoText}>TalentBox</span>
          </div>
          <button onClick={() => navigate('/dashboard/subscription')} style={styles.backBtn}>
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </header>

      <div style={styles.container}>
        <div style={styles.layout}>
          {/* Left - Plan Summary */}
          <div style={styles.summarySection}>
            <h2 style={styles.summaryTitle}>Order Summary</h2>

            <div style={styles.planCard}>
              <div style={styles.planHeader}>
                <h3 style={styles.planName}>{planName} Plan</h3>
                <div style={styles.billingBadge}>
                  {billingCycle === 'monthly' ? 'Monthly' : 'Annual'}
                </div>
              </div>

              <div style={styles.priceDisplay}>
                <div style={styles.price}>₹{price.toLocaleString()}</div>
                <div style={styles.priceLabel}>
                  {billingCycle === 'monthly' ? 'per month' : 'per year'}
                </div>
              </div>

              {billingCycle === 'annual' && (
                <div style={styles.savingsBadge}>
                  Save ₹{(plans[planName].monthly * 12 - plans[planName].annual).toLocaleString()} per year (17% off)
                </div>
              )}

              <div style={styles.divider}></div>

              <div style={styles.featuresSection}>
                <h4 style={styles.featuresTitle}>What's included:</h4>
                <div style={styles.featuresList}>
                  {features.map((feature, index) => (
                    <div key={index} style={styles.featureItem}>
                      <Check size={18} color="#10b981" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div style={styles.trustBadges}>
              <div style={styles.trustBadge}>
                <Shield size={20} color="#6b7280" />
                <span>Secure Payment</span>
              </div>
              <div style={styles.trustBadge}>
                <Zap size={20} color="#6b7280" />
                <span>Instant Activation</span>
              </div>
            </div>
          </div>

          {/* Right - Payment Section */}
          <div style={styles.paymentSection}>
            <h2 style={styles.paymentTitle}>Payment Details</h2>

            {error && (
              <div style={styles.errorBox}>
                <p style={styles.errorText}>{error}</p>
              </div>
            )}

            <div style={styles.paymentCard}>
              <div style={styles.userInfo}>
                <h4 style={styles.userInfoTitle}>Billing Information</h4>
                <div style={styles.userInfoItem}>
                  <span style={styles.userInfoLabel}>Name:</span>
                  <span style={styles.userInfoValue}>{user?.name || 'N/A'}</span>
                </div>
                <div style={styles.userInfoItem}>
                  <span style={styles.userInfoLabel}>Email:</span>
                  <span style={styles.userInfoValue}>{user?.email || 'N/A'}</span>
                </div>
                <div style={styles.userInfoItem}>
                  <span style={styles.userInfoLabel}>Company:</span>
                  <span style={styles.userInfoValue}>{user?.company || 'N/A'}</span>
                </div>
              </div>

              <div style={styles.divider}></div>

              <div style={styles.totalSection}>
                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>Subtotal</span>
                  <span style={styles.totalValue}>₹{price.toLocaleString()}</span>
                </div>
                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>Tax (18% GST)</span>
                  <span style={styles.totalValue}>₹{Math.round(price * 0.18).toLocaleString()}</span>
                </div>
                <div style={styles.divider}></div>
                <div style={styles.totalRow}>
                  <span style={styles.totalLabelBold}>Total Amount</span>
                  <span style={styles.totalValueBold}>₹{Math.round(price * 1.18).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading}
                style={{
                  ...styles.paymentBtn,
                  ...(loading ? styles.paymentBtnDisabled : {}),
                }}
              >
                <CreditCard size={20} />
                <span>{loading ? 'Processing...' : 'Proceed to Payment'}</span>
              </button>

              <p style={styles.secureNote}>
                <Shield size={16} color="#6b7280" />
                Your payment is secured by Razorpay with 256-bit SSL encryption
              </p>
            </div>

            <div style={styles.cancellationPolicy}>
              <h4 style={styles.policyTitle}>Cancellation Policy</h4>
              <p style={styles.policyText}>
                You can cancel your subscription anytime from the dashboard. 
                No refunds for partial months, but you'll retain access until the end of your billing period.
              </p>
            </div>
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
    fontFamily: "'Outfit', sans-serif",
  },

  header: {
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    padding: '1.5rem 0',
  },

  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },

  logoText: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
  },

  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    background: '#fff',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },

  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '3rem 2rem',
  },

  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '3rem',
    alignItems: 'start',
  },

  summarySection: {
    position: 'sticky',
    top: '2rem',
  },

  summaryTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1.5rem',
  },

  planCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '1.5rem',
  },

  planHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },

  planName: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: 0,
  },

  billingBadge: {
    padding: '0.5rem 1rem',
    background: '#eff6ff',
    color: '#1e40af',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
  },

  priceDisplay: {
    marginBottom: '1rem',
  },

  price: {
    fontSize: '3rem',
    fontWeight: '700',
    color: '#FF6B35',
    lineHeight: 1,
  },

  priceLabel: {
    fontSize: '1rem',
    color: '#6b7280',
    marginTop: '0.5rem',
  },

  savingsBadge: {
    padding: '0.75rem 1rem',
    background: '#d1fae5',
    color: '#065f46',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
  },

  divider: {
    height: '1px',
    background: '#e5e7eb',
    margin: '1.5rem 0',
  },

  featuresSection: {
    marginTop: '1.5rem',
  },

  featuresTitle: {
    fontSize: '1.0625rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '1rem',
  },

  featuresList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },

  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.9375rem',
    color: '#4b5563',
  },

  trustBadges: {
    display: 'flex',
    gap: '1.5rem',
  },

  trustBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500',
  },

  paymentSection: {},

  paymentTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1.5rem',
  },

  errorBox: {
    padding: '1rem',
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    marginBottom: '1.5rem',
  },

  errorText: {
    fontSize: '0.9375rem',
    color: '#991b1b',
    margin: 0,
  },

  paymentCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '1.5rem',
  },

  userInfo: {
    marginBottom: '1.5rem',
  },

  userInfoTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '1rem',
  },

  userInfoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    fontSize: '0.9375rem',
  },

  userInfoLabel: {
    color: '#6b7280',
    fontWeight: '500',
  },

  userInfoValue: {
    color: '#1a1a1a',
    fontWeight: '600',
  },

  totalSection: {
    marginTop: '1.5rem',
  },

  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    fontSize: '0.9375rem',
  },

  totalLabel: {
    color: '#6b7280',
    fontWeight: '500',
  },

  totalValue: {
    color: '#1a1a1a',
    fontWeight: '600',
  },

  totalLabelBold: {
    color: '#1a1a1a',
    fontWeight: '700',
    fontSize: '1.125rem',
  },

  totalValueBold: {
    color: '#FF6B35',
    fontWeight: '700',
    fontSize: '1.5rem',
  },

  paymentBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '1rem',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.0625rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
    marginTop: '1.5rem',
  },

  paymentBtnDisabled: {
    background: '#d1d5db',
    cursor: 'not-allowed',
  },

  secureNote: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontSize: '0.8125rem',
    color: '#6b7280',
    marginTop: '1rem',
  },

  cancellationPolicy: {
    padding: '1.5rem',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },

  policyTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.5rem',
  },

  policyText: {
    fontSize: '0.875rem',
    color: '#6b7280',
    lineHeight: '1.6',
    margin: 0,
  },
};

// Hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  button[style*="backBtn"]:hover {
    border-color: #FF6B35 !important;
    color: #FF6B35 !important;
  }
  
  button[style*="paymentBtn"]:hover:not(:disabled) {
    background: #ff5722 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255,107,53,0.3);
  }
`;
document.head.appendChild(styleSheet);

export default CheckoutPage;