import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading, checkTrialExpiry } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If trial expired, redirect to subscription page (but allow subscription page itself)
  const isOnSubscription = location.pathname === '/dashboard/subscription';
  if (!isOnSubscription && checkTrialExpiry()) {
    return <Navigate to="/dashboard/subscription" replace />;
  }

  // User is authenticated and trial is valid (or on subscription page), render the protected component
  return children;
};

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#f9fafb',
    gap: '1.5rem',
  },

  loadingText: {
    fontSize: '1rem',
    color: '#6b7280',
    fontWeight: '500',
  },
};

export default PrivateRoute;
