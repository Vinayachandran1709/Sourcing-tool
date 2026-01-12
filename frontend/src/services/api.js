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

// ===== EMAIL SETTINGS APIs =====

export const getEmailSettings = async () => {
  const response = await api.get('/api/email-settings/settings');
  return response.data;
};

export const updateEmailSettings = async (senderEmail, emailTemplate) => {
  const response = await api.post('/api/email-settings/settings', {
    sender_email: senderEmail,
    email_template: emailTemplate
  });
  return response.data;
};

export const updateSenderEmail = async (senderEmail) => {
  const response = await api.post('/api/email-settings/sender-email', {
    sender_email: senderEmail
  });
  return response.data;
};

export const updateEmailTemplate = async (emailTemplate) => {
  const response = await api.post('/api/email-settings/template', {
    email_template: emailTemplate
  });
  return response.data;
};

export const getEmailUsage = async () => {
  const response = await api.get('/api/email-settings/usage');
  return response.data;
};

export const checkCsvLimit = async () => {
  const response = await api.get('/api/check-csv-limit');
  return response.data;
};

export const logCsvExport = async () => {
  const response = await api.post('/api/log-csv-export');
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

// ===== HEALTH CHECK =====

export const healthCheck = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

export default api;