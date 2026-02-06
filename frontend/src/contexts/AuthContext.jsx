import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const navigate = useNavigate();


  // Define logout first so it can be used in useEffect hooks below
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    // Clear all search session data
    sessionStorage.clear();

    navigate('/login');
  }, [navigate]);


  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setToken(storedToken);

          // Check if trial has expired
          if (userData.subscription_plan === 'free_trial' && userData.trial_end_date) {
            const trialEndDate = new Date(userData.trial_end_date);
            const now = new Date();

            if (now > trialEndDate) {
              // Trial expired - log out user
              logout();
              alert('Your free trial has expired. Please upgrade to continue using TalentBox.');
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [logout]);

  // Auto-check trial expiry every 5 minutes
  useEffect(() => {
    if (!user || user.subscription_plan !== 'free_trial') return;

    const checkTrialExpiry = () => {
      if (user.trial_end_date) {
        const trialEndDate = new Date(user.trial_end_date);
        const now = new Date();

        if (now > trialEndDate) {
          logout();
          alert('Your free trial has expired. Please upgrade to continue using TalentBox.');
        }
      }
    };

    const interval = setInterval(checkTrialExpiry, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
    }, [user, logout]);

const parseApiError = (error, fallback) => {
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map(err => err.msg?.replace(/^Value error, /, '') || err.msg).join('. ');
  }
  if (typeof detail === 'string') {
    return detail;
  }
  return error.response?.data?.message || error.message || fallback;
};

const login = async (email, password) => {
  try {
    const response = await api.post('/api/auth/login', {
      email,
      password
    });

    const data = response.data;

    const userData = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      company: data.user.company || '',
      plan: data.user.plan || 'free_trial',
      subscription_plan: data.user.subscription_plan || data.user.plan || 'free_trial',
      subscription_status: data.user.subscription_status || 'trial',
      trial_end_date: data.user.trial_end_date || null,
      next_billing_date: data.user.next_billing_date || null,
      billing_cycle: data.user.billing_cycle || 'monthly',
      searches_used: data.user.searches_used || 0,
      profile_views_used: data.user.profile_views_used || 0,
      email_credits_used: data.user.email_credits_used || 0,
    };

    setUser(userData);
    setToken(data.token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', data.token);

    navigate('/dashboard/search');
    return { success: true };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: parseApiError(error, 'Login failed') };
  }
};


const signup = async (name, email, company, password) => {
  try {
    const response = await api.post('/api/auth/signup', {
      name,
      email,
      company,
      password
    });

    const data = response.data;

    const userData = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      company: data.user.company || '',
      plan: data.user.plan || 'free_trial',
      subscription_plan: data.user.subscription_plan || data.user.plan || 'free_trial',
      subscription_status: data.user.subscription_status || 'trial',
      trial_end_date: data.user.trial_end_date || null,
      next_billing_date: data.user.next_billing_date || null,
      billing_cycle: data.user.billing_cycle || 'monthly',
      searches_used: data.user.searches_used || 0,
      profile_views_used: data.user.profile_views_used || 0,
      email_credits_used: data.user.email_credits_used || 0,
    };

    setUser(userData);
    setToken(data.token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', data.token);

    navigate('/dashboard/search');
    return { success: true };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: parseApiError(error, 'Signup failed') };
  }
};

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const isTrialExpired = () => {
    if (!user || user.subscription_plan !== 'free_trial') return false;
    if (!user.trial_end_date) return false;

    const trialEndDate = new Date(user.trial_end_date);
    const now = new Date();
    return now > trialEndDate;
  };

  const getDaysRemainingInTrial = () => {
    if (!user || user.subscription_plan !== 'free_trial' || !user.trial_end_date) {
      return null;
    }

    const trialEndDate = new Date(user.trial_end_date);
    const now = new Date();
    const diffTime = trialEndDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isTrialExpired,
    getDaysRemainingInTrial,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
