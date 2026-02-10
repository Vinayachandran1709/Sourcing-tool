import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.clear();
      
      // Don't redirect if already on login/signup page
      if (!window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/signup')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// Authentication APIs
// ============================================

export const login = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
};

export const signup = async (name, email, company, password) => {
  const response = await api.post('/api/auth/signup', {
    name,
    email,
    company,
    password
  });
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post('/api/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token, new_password) => {
  const response = await api.post('/api/auth/reset-password', { token, new_password });
  return response.data;
};

// ============================================
// Search & Profile APIs
// ============================================

export const searchDevelopers = async (filters) => {
  const response = await api.post('/api/search-profiles', filters);
  return response.data;
};

export const getProfiles = async (profileIds) => {
  const response = await api.get('/api/profiles', {
    params: { ids: profileIds.join(',') }
  });
  return response.data;
};

export const toggleProfileSelection = async (profileId) => {
  const response = await api.post('/api/profiles/toggle-selection', { 
    profile_id: profileId 
  });
  return response.data;
};

// ============================================
// Email APIs
// ============================================

export const sendBulkEmails = async (profiles, template, subject) => {
  const response = await api.post('/api/send-bulk-emails', {
    profiles,
    template,
    subject
  });
  return response.data;
};

export const getEmailUsage = async () => {
  const response = await api.get('/api/email-settings/usage');
  return response.data;
};

export const getEmailSettings = async () => {
  const response = await api.get('/api/email-settings/settings');
  return response.data;
};

export const updateEmailSettings = async (settings) => {
  const response = await api.post('/api/email-settings/settings', settings);
  return response.data;
};

// ============================================
// Saved Lists APIs
// ============================================

export const getSavedLists = async () => {
  const response = await api.get('/api/lists');
  return response.data;
};

export const createSavedList = async (name, description = '') => {
  const response = await api.post('/api/lists', { name, description });
  return response.data;
};

export const deleteSavedList = async (listId) => {
  const response = await api.delete(`/api/lists/${listId}`);
  return response.data;
};

export const getListProfiles = async (listId) => {
  const response = await api.get(`/api/lists/${listId}/profiles`);
  return response.data;
};

export const addProfileToList = async (listId, profile) => {
  const response = await api.post(`/api/lists/${listId}/profiles`, { profile });
  return response.data;
};

export const removeProfileFromList = async (listId, profileId) => {
  const response = await api.delete(`/api/lists/${listId}/profiles/${profileId}`);
  return response.data;
};

// ============================================
// Usage & Subscription APIs
// ============================================

export const getUsageStats = async () => {
  const response = await api.get('/api/usage-stats');
  return response.data;
};

export const checkCsvLimit = async () => {
  const response = await api.get('/api/csv/check-limit');
  return response.data;
};

export const logCsvExport = async (profileCount) => {
  const response = await api.post('/api/csv/log-export', { 
    profile_count: profileCount 
  });
  return response.data;
};

// ============================================
// Payment APIs (Razorpay Integration)
// ============================================

/**
 * Create a Razorpay order for payment
 * @param {string} plan - Plan name (e.g., 'starter')
 * @param {string} billingCycle - 'monthly' or 'annual'
 * @param {boolean} isRenewal - Whether this is a renewal payment
 * @returns {Object} Order details including razorpay order_id
 */
export const createPaymentOrder = async (plan, billingCycle, isRenewal = false) => {
  const response = await api.post('/api/payments/create-order', {
    plan,
    billing_cycle: billingCycle,
    is_renewal: isRenewal
  });
  return response.data;
};

/**
 * Verify payment after Razorpay checkout completion
 * @param {Object} paymentData - Contains razorpay_order_id, razorpay_payment_id, razorpay_signature
 * @param {string} plan - Plan that was purchased
 * @param {string} billingCycle - Billing cycle selected
 * @returns {Object} Verification result and updated subscription info
 */
export const verifyPayment = async (paymentData, plan, billingCycle) => {
  const response = await api.post('/api/payments/verify', {
    razorpay_order_id: paymentData.razorpay_order_id,
    razorpay_payment_id: paymentData.razorpay_payment_id,
    razorpay_signature: paymentData.razorpay_signature,
    plan,
    billing_cycle: billingCycle
  });
  return response.data;
};

/**
 * Get current subscription status
 * Used to refresh user subscription data without full re-login
 * @returns {Object} Current subscription details and usage stats
 */
export const getSubscriptionStatus = async () => {
  const response = await api.get('/api/payments/status');
  return response.data;
};

/**
 * Get payment history for the current user
 * @returns {Object} List of past payments
 */
export const getPaymentHistory = async () => {
  const response = await api.get('/api/payments/history');
  return response.data;
};

/**
 * Cancel current subscription
 * User retains access until end of billing period
 * @param {string} reason - Optional cancellation reason
 * @returns {Object} Cancellation confirmation with access_until date
 */
export const cancelSubscription = async (reason = null) => {
  const response = await api.post('/api/payments/cancel', { reason });
  return response.data;
};

/**
 * Get available subscription plans (public endpoint)
 * @returns {Object} List of available plans with pricing and features
 */
export const getAvailablePlans = async () => {
  const response = await api.get('/api/payments/plans');
  return response.data;
};

// ============================================
// Razorpay Checkout Helper
// ============================================

/**
 * Initialize and open Razorpay checkout modal
 * @param {Object} orderData - Order data from createPaymentOrder response
 * @param {Function} onSuccess - Callback on successful payment
 * @param {Function} onFailure - Callback on payment failure
 * @param {Function} onDismiss - Callback when modal is closed without payment
 */
export const openRazorpayCheckout = (orderData, onSuccess, onFailure, onDismiss) => {
  // Check if Razorpay is loaded
  if (!window.Razorpay) {
    console.error('Razorpay SDK not loaded');
    onFailure({ error: 'Payment system not available. Please refresh the page.' });
    return;
  }

  const options = {
    key: process.env.REACT_APP_RAZORPAY_KEY_ID,
    amount: orderData.amount,
    currency: orderData.currency || 'INR',
    name: orderData.name || 'TalentBox',
    description: orderData.description,
    order_id: orderData.order_id,
    prefill: {
      name: orderData.prefill?.name || '',
      email: orderData.prefill?.email || '',
    },
    notes: orderData.notes || {},
    theme: {
      color: '#FF6B35'  // TalentBox brand color
    },
    handler: function (response) {
      // Payment successful - verify with backend
      onSuccess({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      });
    },
    modal: {
      ondismiss: function () {
        // User closed the modal without completing payment
        if (onDismiss) {
          onDismiss();
        }
      },
      escape: true,
      animation: true
    }
  };

  try {
    const razorpay = new window.Razorpay(options);
    
    razorpay.on('payment.failed', function (response) {
      onFailure({
        error: response.error.description || 'Payment failed',
        code: response.error.code,
        reason: response.error.reason
      });
    });
    
    razorpay.open();
  } catch (error) {
    console.error('Failed to open Razorpay:', error);
    onFailure({ error: 'Failed to initialize payment. Please try again.' });
  }
};

// ============================================
// Contact Form API (Public)
// ============================================

export const sendContactMessage = async (formData) => {
  const response = await api.post('/api/public/contact/send', formData);
  return response.data;
};

// ============================================
// Feedback APIs
// ============================================

export const submitFeedback = async (feedbackData) => {
  const response = await api.post('/api/feedback/submit', feedbackData);
  return response.data;
};

export const getFeedbackHistory = async () => {
  const response = await api.get('/api/feedback/history');
  return response.data;
};

// Export the axios instance for custom requests
export default api;