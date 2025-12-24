// Razorpay integration service
const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID;

/**
 * Opens Razorpay checkout with provided options
 * @param {Object} options - Payment options
 * @param {Function} onSuccess - Success callback
 * @param {Function} onFailure - Failure callback
 */
export const openRazorpayCheckout = (options, onSuccess, onFailure) => {
  if (!window.Razorpay) {
    console.error('Razorpay SDK not loaded');
    onFailure(new Error('Payment gateway not available. Please refresh the page.'));
    return;
  }

  const razorpayOptions = {
    key: RAZORPAY_KEY_ID,
    amount: options.amount, // Amount in paise (multiply by 100)
    currency: options.currency || 'INR',
    name: 'TalentBox',
    description: options.description || 'Subscription Plan',
    image: '/logo192.png', // Your logo
    order_id: options.orderId, // Order ID from backend
    handler: function (response) {
      // Payment successful
      onSuccess({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
      });
    },
    prefill: {
      name: options.userDetails?.name || '',
      email: options.userDetails?.email || '',
      contact: options.userDetails?.phone || '',
    },
    notes: {
      plan_name: options.planName || '',
      billing_cycle: options.billingCycle || 'monthly',
    },
    theme: {
      color: '#FF6B35',
    },
    modal: {
      ondismiss: function () {
        // User closed the checkout
        onFailure(new Error('Payment cancelled by user'));
      },
    },
  };

  const rzp = new window.Razorpay(razorpayOptions);
  
  rzp.on('payment.failed', function (response) {
    onFailure({
      code: response.error.code,
      description: response.error.description,
      source: response.error.source,
      step: response.error.step,
      reason: response.error.reason,
      metadata: response.error.metadata,
    });
  });

  rzp.open();
};

/**
 * Create Razorpay order on backend
 * @param {Object} planDetails - Plan details
 * @returns {Promise} - Order details
 */
export const createRazorpayOrder = async (planDetails) => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_BASE_URL}/api/razorpay/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(planDetails),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create order');
  }

  return await response.json();
};

/**
 * Verify payment on backend
 * @param {Object} paymentDetails - Payment verification details
 * @returns {Promise} - Verification result
 */
export const verifyRazorpayPayment = async (paymentDetails) => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_BASE_URL}/api/razorpay/verify-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(paymentDetails),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Payment verification failed');
  }

  return await response.json();
};

export default {
  openRazorpayCheckout,
  createRazorpayOrder,
  verifyRazorpayPayment,
};