import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

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

// Search & Profile APIs
export const searchDevelopers = async (filters) => {
  const response = await api.post('/api/search-profiles', filters);
  return response.data;
};

export const getProfiles = async (params) => {
  const response = await api.get('/api/profiles', { params });
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

// Email APIs
export const sendBulkEmails = async (emailData) => {
  const response = await api.post('/api/send-bulk-emails', emailData);
  return response.data;
};

export const getOutreachHistory = async (limit = 100) => {
  const response = await api.get('/api/outreach-history', { params: { limit } });
  return response.data;
};

// Search History APIs
export const getSearchHistory = async (limit = 50) => {
  const response = await api.get('/api/search-history', { params: { limit } });
  return response.data;
};

// Saved Lists APIs
export const getSavedLists = async () => {
  const response = await api.get('/api/saved-lists');
  return response.data;
};

export const createSavedList = async (name, description) => {
  const response = await api.post('/api/saved-lists', { name, description });
  return response.data;
};

export const deleteSavedList = async (listId) => {
  const response = await api.delete(`/api/saved-lists/${listId}`);
  return response.data;
};

export const addProfileToList = async (listId, profileId) => {
  const response = await api.post(`/api/saved-lists/${listId}/profiles`, { profile_id: profileId });
  return response.data;
};

export const removeProfileFromList = async (listId, profileId) => {
  const response = await api.delete(`/api/saved-lists/${listId}/profiles/${profileId}`);
  return response.data;
};

// Email Templates APIs
export const getEmailTemplates = async () => {
  const response = await api.get('/api/email-templates');
  return response.data;
};

export const createEmailTemplate = async (templateData) => {
  const response = await api.post('/api/email-templates', templateData);
  return response.data;
};

export const deleteEmailTemplate = async (templateId) => {
  const response = await api.delete(`/api/email-templates/${templateId}`);
  return response.data;
};

// Analytics APIs
export const getAnalytics = async (timeRange = '7d') => {
  const response = await api.get('/api/analytics/overview', { params: { time_range: timeRange } });
  return response.data;
};

// User/Subscription APIs
export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

export const updateUserProfile = async (updates) => {
  const response = await api.patch('/api/auth/profile', updates);
  return response.data;
};

export default api;