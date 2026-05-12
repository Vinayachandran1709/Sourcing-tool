import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const candidateApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

candidateApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('candidateToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

candidateApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('candidateToken');
      localStorage.removeItem('candidateUser');
      if (
        !window.location.pathname.includes('/candidate/login') &&
        !window.location.pathname.includes('/candidate/signup')
      ) {
        window.location.href = '/candidate/login';
      }
    }
    return Promise.reject(error);
  }
);

export const candidateSignup = async (data) => {
  const response = await candidateApi.post('/api/candidate/auth/signup', data);
  return response.data;
};

export const candidateLogin = async (email, password) => {
  const response = await candidateApi.post('/api/candidate/auth/login', { email, password });
  return response.data;
};

export const getCandidateProfile = async () => {
  const response = await candidateApi.get('/api/candidate/profile');
  return response.data;
};

export const uploadCandidateResume = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await candidateApi.post('/api/candidate/upload-resume', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const triggerCandidateImport = async () => {
  const response = await candidateApi.post('/api/candidate/import-data');
  return response.data;
};

export const getCandidateImportStatus = async () => {
  const response = await candidateApi.get('/api/candidate/import-status');
  return response.data;
};

export default candidateApi;
