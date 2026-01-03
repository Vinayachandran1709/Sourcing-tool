import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect to login
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ===== AUTHENTICATION APIs =====

export const login = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
};

export const signup = async (name, email, company, password) => {
  const response = await api.post('/api/auth/signup', { name, email, company, password });
  return response.data;
};

// ===== SEARCH & PROFILE APIs =====

export const searchDevelopers = async (filters) => {
  const response = await api.post('/api/search-profiles', filters);
  return response.data;
};

export const getProfiles = async (params) => {
  const response = await api.get('/api/profiles', { params });
  return response.data;
};

export const getProfileDetails = async (profileId) => {
  const response = await api.get(`/api/profiles/${profileId}`);
  return response.data;
};

export const toggleProfileSelection = async (profileId) => {
  const response = await api.patch(`/api/profiles/${profileId}/toggle-select`);
  return response.data;
};

export const getSelectedProfiles = async () => {
  const response = await api.get('/api/selected-profiles');
  return response.data;
};

// ===== EMAIL APIs =====

export const sendBulkEmails = async (emailData) => {
  const response = await api.post('/api/send-bulk-emails', emailData);
  return response.data;
};

export const getOutreachHistory = async (limit = 100) => {
  const response = await api.get('/api/outreach-history', { params: { limit } });
  return response.data;
};

// ===== EMAIL TEMPLATES APIs (FIXED ENDPOINTS) =====

export const getEmailTemplates = async () => {
  const response = await api.get('/api/emails/templates');
  return response.data;
};

export const createEmailTemplate = async (templateData) => {
  const response = await api.post('/api/emails/templates/create', templateData);
  return response.data;
};

export const updateEmailTemplate = async (templateId, templateData) => {
  const response = await api.put(`/api/emails/templates/${templateId}`, templateData);
  return response.data;
};

export const deleteEmailTemplate = async (templateId) => {
  const response = await api.delete(`/api/emails/templates/${templateId}`);
  return response.data;
};

export const createDefaultTemplates = async () => {
  const response = await api.post('/api/emails/templates/create-defaults');
  return response.data;
};

// ===== EMAIL CAMPAIGNS APIs =====

export const sendCampaign = async (campaignData) => {
  const response = await api.post('/api/emails/campaigns/send', campaignData);
  return response.data;
};

export const getCampaigns = async (status = null) => {
  const params = status ? { status } : {};
  const response = await api.get('/api/emails/campaigns', { params });
  return response.data;
};

export const markCampaignReplied = async (campaignId, replyContent = null) => {
  const response = await api.post(`/api/emails/campaigns/${campaignId}/reply`, { reply_content: replyContent });
  return response.data;
};

// ===== SAVED LISTS APIs (FIXED ENDPOINTS) =====

export const getSavedLists = async () => {
  const response = await api.get('/api/lists');
  return response.data;
};

export const createSavedList = async (name, description = null) => {
  const response = await api.post('/api/lists/create', { name, description });
  return response.data;
};

export const updateSavedList = async (listId, name, description) => {
  const response = await api.put(`/api/lists/${listId}`, { name, description });
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

export const addProfileToList = async (listId, profileId, notes = null) => {
  const response = await api.post(`/api/lists/${listId}/add-profile`, { 
    profile_id: profileId,
    notes: notes
  });
  return response.data;
};

export const removeProfileFromList = async (listId, profileId) => {
  const response = await api.delete(`/api/lists/${listId}/remove-profile/${profileId}`);
  return response.data;
};

export const updateProfileNotes = async (listId, profileId, notes) => {
  const response = await api.put(`/api/lists/${listId}/profiles/${profileId}/notes`, { notes });
  return response.data;
};

export const getListLimits = async () => {
  const response = await api.get('/api/lists/limits');
  return response.data;
};

// ===== USAGE & SUBSCRIPTION APIs =====

export const getUsageStats = async () => {
  const response = await api.get('/api/usage-stats');
  return response.data;
};

// ===== RAZORPAY PAYMENT APIs =====

export const createRazorpayOrder = async (planId, billingCycle) => {
  const response = await api.post('/api/razorpay/create-order', { 
    plan_id: planId,
    billing_cycle: billingCycle
  });
  return response.data;
};

export const verifyRazorpayPayment = async (paymentData) => {
  const response = await api.post('/api/razorpay/verify-payment', paymentData);
  return response.data;
};

export const getSubscriptionDetails = async () => {
  const response = await api.get('/api/razorpay/subscription');
  return response.data;
};

// ===== WAITLIST API (PUBLIC) =====

export const joinWaitlist = async (name, company, email) => {
  const response = await api.post('/api/public/waitlist/join', { name, company, email });
  return response.data;
};

// ===== HEALTH CHECK =====

export const healthCheck = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

export default api;