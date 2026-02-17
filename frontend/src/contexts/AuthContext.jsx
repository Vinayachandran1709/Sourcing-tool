import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, signup as apiSignup, getSubscriptionStatus, getUsageStats } from '../services/api';
import { identifyUser, resetUser, trackLogin, trackSignup, trackLogout, trackUsageSnapshot } from '../services/analytics';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Core auth state
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Trial expiry modal state
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false);

  // Usage stats state with localStorage caching
  const [usageStats, setUsageStats] = useState(() => {
    const cached = localStorage.getItem('usageStats');
    return cached ? JSON.parse(cached) : null;
  });

  // Check if user is authenticated
  const isAuthenticated = Boolean(token && user);

  // ============================================
  // Logout Function
  // ============================================
  const logout = useCallback(() => {
    trackLogout();
    resetUser();
    // Clear all auth-related storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('emailSettings');  // Clear cached email settings
    localStorage.removeItem('unlockedProfileIds');  // Clear unlocked profiles
    localStorage.removeItem('usageStats');  // Clear usage stats cache
    sessionStorage.clear();  // Clear session data (search results, filters)

    // Reset state
    setUser(null);
    setToken(null);
    setUsageStats(null);
    setShowTrialExpiredModal(false);
  }, []);

  // ============================================
  // Trial Expiry Check
  // ============================================
  const checkTrialExpiry = useCallback(() => {
    if (!user) return false;
    
    // Only check for free trial users
    const isTrial = user.subscription_plan === 'free_trial' || 
                    user.subscription_plan === 'free' ||
                    user.plan === 'free_trial';
    
    if (!isTrial) return false;
    
    // Check if trial has expired
    const trialEndDate = user.trial_end_date;
    if (!trialEndDate) return false;
    
    const now = new Date();
    const trialEnd = new Date(trialEndDate);
    
    if (now > trialEnd) {
      setShowTrialExpiredModal(true);
      return true;
    }
    
    return false;
  }, [user]);

  // Check trial expiry on mount and periodically
  useEffect(() => {
    if (!user) return;
    
    // Initial check
    checkTrialExpiry();
    
    // Check every 5 minutes
    const interval = setInterval(checkTrialExpiry, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user, checkTrialExpiry]);

  // ============================================
  // Login Function
  // ============================================
  const login = async (email, password) => {
    try {
      const data = await apiLogin(email, password);
      
      if (data.access_token && data.user) {
        const userData = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          company: data.user.company,
          subscription_plan: data.user.subscription_plan || data.user.plan || 'free_trial',
          subscription_status: data.user.subscription_status || 'active',
          trial_end_date: data.user.trial_end_date,
          next_billing_date: data.user.next_billing_date,
          billing_cycle: data.user.billing_cycle || 'monthly',
          searches_used: data.user.searches_used || 0,
          profile_views_used: data.user.profile_views_used || 0,
          email_credits_used: data.user.email_credits_used || 0,
        };

        // Clear stale session data from previous sessions
        sessionStorage.clear();

        // Store in localStorage
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(userData));

        // Update state
        setToken(data.access_token);
        setUser(userData);

        // PostHog: identify user and track login
        identifyUser(userData);
        trackLogin(userData);

        return { success: true };
      }

      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.detail || 'Login failed. Please try again.';
      return { success: false, error: errorMessage };
    }
  };

  // ============================================
  // Signup Function
  // ============================================
  const signup = async (name, email, company, password) => {
    try {
      const data = await apiSignup(name, email, company, password);
      
      if (data.access_token && data.user) {
        const userData = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          company: data.user.company,
          subscription_plan: data.user.subscription_plan || data.user.plan || 'free_trial',
          subscription_status: data.user.subscription_status || 'trial',
          trial_end_date: data.user.trial_end_date,
          next_billing_date: data.user.next_billing_date,
          billing_cycle: data.user.billing_cycle || 'monthly',
          searches_used: 0,
          profile_views_used: 0,
          email_credits_used: 0,
        };

        // Clear any stale session data
        sessionStorage.clear();

        // Store in localStorage
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(userData));

        // Update state
        setToken(data.access_token);
        setUser(userData);

        // PostHog: identify user and track signup
        identifyUser(userData);
        trackSignup(userData);

        return { success: true };
      }

      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error.response?.data?.detail || 'Signup failed. Please try again.';
      return { success: false, error: errorMessage };
    }
  };

  // ============================================
  // Refresh Subscription (Post-Payment Update)
  // ============================================
  /**
   * Refresh subscription data from backend
   * Call this after successful payment to update user state without re-login
   */
  const refreshSubscription = async () => {
    if (!token) return { success: false, error: 'Not authenticated' };
    
    try {
      const data = await getSubscriptionStatus();
      
      if (data.success && data.subscription) {
        const updatedUser = {
          ...user,
          subscription_plan: data.subscription.plan,
          subscription_status: data.subscription.status,
          billing_cycle: data.subscription.billing_cycle,
          next_billing_date: data.subscription.next_billing_date,
          trial_end_date: data.subscription.trial_end_date,
          // Update usage if provided
          searches_used: data.usage?.searches?.used ?? user.searches_used,
          profile_views_used: data.usage?.profile_unlocks?.used ?? user.profile_views_used,
          email_credits_used: data.usage?.emails?.used ?? user.email_credits_used,
        };
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Update state
        setUser(updatedUser);
        
        // Hide trial expired modal if subscription is now active
        if (data.subscription.status === 'active' && 
            data.subscription.plan !== 'free_trial' && 
            data.subscription.plan !== 'free') {
          setShowTrialExpiredModal(false);
        }
        
        return { success: true, subscription: data.subscription };
      }
      
      return { success: false, error: 'Failed to fetch subscription status' };
    } catch (error) {
      console.error('Refresh subscription error:', error);
      return { success: false, error: 'Failed to refresh subscription' };
    }
  };

  // ============================================
  // Update User (Local State Update)
  // ============================================
  /**
   * Update user data locally (for immediate UI updates)
   */
  const updateUser = (updates) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // ============================================
  // Calculate Trial Days Remaining
  // ============================================
  const getTrialDaysRemaining = useCallback(() => {
    if (!user?.trial_end_date) return null;
    
    const isTrial = user.subscription_plan === 'free_trial' || 
                    user.subscription_plan === 'free' ||
                    user.plan === 'free_trial';
    
    if (!isTrial) return null;
    
    const now = new Date();
    const trialEnd = new Date(user.trial_end_date);
    const diffTime = trialEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  }, [user]);

  // ============================================
  // Calculate Days Until Billing
  // ============================================
  const getDaysUntilBilling = useCallback(() => {
    if (!user?.next_billing_date) return null;

    const now = new Date();
    const billingDate = new Date(user.next_billing_date);
    const diffTime = billingDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }, [user]);

  // ============================================
  // Fetch and Update Usage Stats
  // ============================================
  /**
   * Fetch latest usage stats from backend
   * Updates both usageStats state and localStorage cache
   */
  const fetchUsageStats = useCallback(async (silent = false) => {
    if (!token) return null;

    try {
      const data = await getUsageStats();

      const formattedStats = {
        searches: {
          used: data.usage?.searches?.used || 0,
          limit: data.usage?.searches?.limit || 25,
          can_use: data.usage?.searches?.can_use !== false
        },
        profile_unlocks: {
          used: data.usage?.profile_views?.used || 0,
          limit: data.usage?.profile_views?.limit || 40,
          can_use: data.usage?.profile_views?.can_use !== false
        },
        emails: {
          used: data.usage?.emails_sent?.used || 0,
          limit: data.usage?.emails_sent?.limit || 15,
          can_use: data.usage?.emails_sent?.can_use !== false
        },
        plan: data.plan || 'free_trial',
        billing_cycle: data.billing_cycle || 'monthly',
        subscription_status: data.subscription_status || 'active',
        trial_end_date: data.trial_end_date,
        next_billing_date: data.next_billing_date,
        lastUpdated: Date.now()
      };

      // Update state and cache
      setUsageStats(formattedStats);
      localStorage.setItem('usageStats', JSON.stringify(formattedStats));

      // Track usage snapshot for retention/usage analytics
      trackUsageSnapshot(formattedStats);

      return formattedStats;
    } catch (error) {
      if (!silent) {
        console.error('Failed to fetch usage stats:', error);
      }
      return null;
    }
  }, [token]);

  // ============================================
  // Refresh Usage From Backend
  // ============================================
  /**
   * Called after every user action to get the real usage numbers from backend.
   * Short delay so backend has time to commit the DB write.
   */
  const refreshUsageAfterAction = useCallback(() => {
    // Small delay to let backend commit, then fetch real numbers
    setTimeout(() => {
      fetchUsageStats(true);  // silent refresh
    }, 500);
  }, [fetchUsageStats]);

  // ============================================
  // Increment Usage (Optimistic + Backend Refresh)
  // ============================================
  /**
   * Increment usage count locally for immediate UI feedback,
   * then refresh from backend to get the real numbers.
   */
  const incrementUsage = useCallback((type, count = 1) => {
    // Optimistic local update for instant UI feedback
    setUsageStats(prev => {
      if (!prev) return prev;

      const updated = { ...prev };

      if (type === 'search' && updated.searches) {
        updated.searches = {
          ...updated.searches,
          used: updated.searches.used + count
        };
      } else if (type === 'profile_unlock' && updated.profile_unlocks) {
        updated.profile_unlocks = {
          ...updated.profile_unlocks,
          used: updated.profile_unlocks.used + count
        };
      } else if (type === 'email' && updated.emails) {
        updated.emails = {
          ...updated.emails,
          used: updated.emails.used + count
        };
      }

      updated.lastUpdated = Date.now();
      localStorage.setItem('usageStats', JSON.stringify(updated));
      return updated;
    });

    // Then refresh from backend for real numbers
    refreshUsageAfterAction();
  }, [refreshUsageAfterAction]);

  // ============================================
  // Initial Auth Check
  // ============================================
  useEffect(() => {
    // Verify stored auth is still valid
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);
        // Re-identify user on page reload
        identifyUser(parsedUser);
      } catch (e) {
        // Invalid stored data, clear it
        logout();
      }
    }

    setLoading(false);
  }, [logout]);

  // ============================================
  // Auto-fetch Usage Stats
  // ============================================
  useEffect(() => {
    if (!token || !isAuthenticated) return;

    // Fetch fresh stats on login/mount
    fetchUsageStats(false);

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUsageStats(true);  // Silent refresh
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic refresh every 5 minutes
    const interval = setInterval(() => {
      fetchUsageStats(true);  // Silent refresh
    }, 5 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated]);

  // ============================================
  // Context Value
  // ============================================
  const value = {
    // Auth state
    user,
    token,
    isAuthenticated,
    loading,

    // Auth functions
    login,
    signup,
    logout,

    // Subscription functions
    refreshSubscription,
    updateUser,

    // Trial/billing helpers
    getTrialDaysRemaining,
    getDaysUntilBilling,
    checkTrialExpiry,

    // Trial expired modal
    showTrialExpiredModal,
    setShowTrialExpiredModal,

    // Usage stats
    usageStats,
    fetchUsageStats,
    incrementUsage,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
