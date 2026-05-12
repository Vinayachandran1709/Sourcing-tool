import React, { createContext, useContext, useState, useEffect } from 'react';
import { candidateLogin as apiCandidateLogin, candidateSignup as apiCandidateSignup } from '../services/candidateApi';

const CandidateAuthContext = createContext(null);

export const CandidateAuthProvider = ({ children }) => {
  const [candidate, setCandidate] = useState(() => {
    const savedUser = localStorage.getItem('candidateUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [candidateToken, setCandidateToken] = useState(() => localStorage.getItem('candidateToken'));
  const [loading, setLoading] = useState(true);

  const isCandidateAuthenticated = Boolean(candidateToken && candidate);

  const candidateLogout = () => {
    localStorage.removeItem('candidateToken');
    localStorage.removeItem('candidateUser');
    setCandidate(null);
    setCandidateToken(null);
  };

  const candidateLogin = async (email, password) => {
    try {
      const data = await apiCandidateLogin(email, password);
      if (data.access_token && data.candidate) {
        localStorage.setItem('candidateToken', data.access_token);
        localStorage.setItem('candidateUser', JSON.stringify(data.candidate));
        setCandidateToken(data.access_token);
        setCandidate(data.candidate);
        return { success: true };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Candidate login error:', error);
      return { success: false, error: error.response?.data?.message || error.response?.data?.detail || 'Login failed. Please try again.' };
    }
  };

  const candidateSignup = async (signupData) => {
    try {
      const data = await apiCandidateSignup(signupData);
      if (data.access_token && data.candidate) {
        localStorage.setItem('candidateToken', data.access_token);
        localStorage.setItem('candidateUser', JSON.stringify(data.candidate));
        setCandidateToken(data.access_token);
        setCandidate(data.candidate);
        return { success: true };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Candidate signup error:', error);
      return { success: false, error: error.response?.data?.message || error.response?.data?.detail || 'Signup failed. Please try again.' };
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('candidateToken');
    const storedCandidate = localStorage.getItem('candidateUser');

    if (storedToken && storedCandidate) {
      try {
        const parsedCandidate = JSON.parse(storedCandidate);
        setCandidate(parsedCandidate);
        setCandidateToken(storedToken);
      } catch (e) {
        candidateLogout();
      }
    }
    setLoading(false);
  }, []);

  const value = {
    candidate,
    candidateToken,
    isCandidateAuthenticated,
    loading,
    candidateLogin,
    candidateSignup,
    candidateLogout
  };

  return (
    <CandidateAuthContext.Provider value={value}>
      {children}
    </CandidateAuthContext.Provider>
  );
};

export const useCandidateAuth = () => {
  const context = useContext(CandidateAuthContext);
  if (!context) {
    throw new Error('useCandidateAuth must be used within a CandidateAuthProvider');
  }
  return context;
};

export default CandidateAuthContext;
