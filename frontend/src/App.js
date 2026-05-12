import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './App.css';

// Public Pages
import HomePage from './pages/HomePage';
import DevCardPage from './pages/DevCardPage';
import DevProfilePage from './pages/DevProfilePage';
import ForCompaniesPage from './pages/ForCompaniesPage';
import ForCandidatesPage from './pages/ForCandidatesPage';
import HireFreePage from './pages/HireFreePage';
import PricingPage from './pages/PricingPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import TermsPage from './pages/TermsPage';          
import PrivacyPage from './pages/PrivacyPage';   
import RefundPage from './pages/RefundPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Candidate Auth & Pages
import { CandidateAuthProvider } from './contexts/CandidateAuthContext';
import CandidatePrivateRoute from './components/CandidatePrivateRoute';
import CandidateSignupPage from './pages/CandidateSignupPage';
import CandidateLoginPage from './pages/CandidateLoginPage';
import CandidateDashboardPage from './pages/CandidateDashboardPage';
import CandidateImportPage from './pages/CandidateImportPage';

// Dashboard Layout & Pages
import DashboardLayout from './components/dashboard/DashboardLayout';
import SearchDashboard from './pages/Dashboard/SearchDashboard';
import SavedProfilesPage from './pages/Dashboard/SavedProfilesPage';
import SubscriptionPage from './pages/Dashboard/SubscriptionPage';

function App() {
  return (
    <ErrorBoundary>
    <Router>
      <AuthProvider>
        <CandidateAuthProvider>
          <div className="App">
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/terms" element={<TermsPage />} />              
            <Route path="/privacy-policy" element={<PrivacyPage />} />   
            <Route path="/refund-policy" element={<RefundPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard/search" replace />} />
              <Route path="search" element={<SearchDashboard />} />
              <Route path="saved-profiles" element={<SavedProfilesPage />} />
              <Route path="subscription" element={<SubscriptionPage />} />
            </Route>

            {/* Candidate Routes */}
            <Route path="/candidate/signup" element={<CandidateSignupPage />} />
            <Route path="/candidate/login" element={<CandidateLoginPage />} />
            <Route path="/candidate/import" element={
              <CandidatePrivateRoute>
                <CandidateImportPage />
              </CandidatePrivateRoute>
            } />
            <Route path="/candidate/dashboard" element={
              <CandidatePrivateRoute>
                <CandidateDashboardPage />
              </CandidatePrivateRoute>
            } />

            {/* HIDDEN: DevCard routes
            <Route path="/devcard" element={<DevCardPage />} />
            <Route path="/dev/:username" element={<DevProfilePage />} />
            */}
            
            <Route path="/for-companies" element={<ForCompaniesPage />} />
            <Route path="/for-candidates" element={<ForCandidatesPage />} />
            <Route path="/hire-free" element={<HireFreePage />} />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        
        {/* Vercel Speed Insights - tracks performance */}
        <SpeedInsights />
        </CandidateAuthProvider>
      </AuthProvider>
    </Router>
    </ErrorBoundary>
  );
}

export default App;