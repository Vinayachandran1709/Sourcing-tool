import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

// Public Pages
import HomePage from './pages/HomePage';
import PricingPage from './pages/PricingPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import TermsPage from './pages/TermsPage';          // ← ADD THIS
import PrivacyPage from './pages/PrivacyPage';      // ← ADD THIS
import RefundPage from './pages/RefundPage';        // ← ADD THIS

// Dashboard Layout & Pages
import DashboardLayout from './components/dashboard/DashboardLayout';
import SearchDashboard from './pages/Dashboard/SearchDashboard';
import SavedProfilesPage from './pages/Dashboard/SavedProfilesPage';
import SubscriptionPage from './pages/Dashboard/SubscriptionPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/terms" element={<TermsPage />} />              // ← ADD THIS
            <Route path="/privacy-policy" element={<PrivacyPage />} />   // ← ADD THIS
            <Route path="/refund-policy" element={<RefundPage />} />     // ← ADD THIS

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

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;