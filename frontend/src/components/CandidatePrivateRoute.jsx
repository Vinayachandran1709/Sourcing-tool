import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCandidateAuth } from '../contexts/CandidateAuthContext';

const CandidatePrivateRoute = ({ children }) => {
  const { isCandidateAuthenticated, loading } = useCandidateAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fafafa' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #FF6B35', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>
          {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
        </style>
      </div>
    );
  }

  if (!isCandidateAuthenticated) {
    return <Navigate to="/candidate/login" state={{ from: location }} replace />;
  }

  return children;
};

export default CandidatePrivateRoute;
