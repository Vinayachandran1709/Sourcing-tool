import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export const sendBulkEmails = async (emailData) => {
  const response = await api.post('/api/send-bulk-emails', emailData);
  return response.data;
};

export const getOutreachHistory = async (limit = 100) => {
  const response = await api.get('/api/outreach-history', { params: { limit } });
  return response.data;
};

export const getSearchHistory = async (limit = 50) => {
  const response = await api.get('/api/search-history', { params: { limit } });
  return response.data;
};

export default api;