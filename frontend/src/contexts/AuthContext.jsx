import React, { createContext, useState, useContext, useEffect } from 'react';
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
  }, []);

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
  }, [user]);

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
      subscription_plan: data.user.subscription_plan || 'free_trial',
      subscription_status: data.user.subscription_status || 'active',
      trial_end_date: data.user.trial_end_date || null,
      searches_used: data.user.searches_used || 0,
      profile_views_used: data.user.profile_views_used || 0,
      email_credits_used: data.user.email_credits_used || 0,
    };

    setUser(userData);
    setToken(data.token);
    // ✅ REMOVED setIsAuthenticated(true) - it's computed from !!user
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', data.token);

    navigate('/dashboard/search');  // ⭐ ADD REDIRECT
    return { success: true };
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error.response?.data?.message || error.response?.data?.detail || error.message || 'Login failed';
    return { success: false, error: errorMessage };
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
      subscription_plan: data.user.subscription_plan || 'free_trial',
      subscription_status: data.user.subscription_status || 'active',
      trial_end_date: data.user.trial_end_date || null,
      searches_used: data.user.searches_used || 0,
      profile_views_used: data.user.profile_views_used || 0,
      email_credits_used: data.user.email_credits_used || 0,
    };

    setUser(userData);
    setToken(data.token);
    // ✅ REMOVED setIsAuthenticated(true) - it's computed from !!user
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', data.token);

    navigate('/dashboard/search');  // ⭐ ADD REDIRECT
    return { success: true };
  } catch (error) {
    console.error('Signup error:', error);
    const errorMessage = error.response?.data?.message || error.response?.data?.detail || error.message || 'Signup failed';
    return { success: false, error: errorMessage };
  }
};

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
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