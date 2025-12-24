import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import './App.css';
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';

// Public Pages
import HomePage from './pages/HomePage';
import PricingPage from './pages/PricingPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import LandingPage from './pages/LandingPage';

// Dashboard Layout & Pages
import DashboardLayout from './components/dashboard/DashboardLayout';
import SearchDashboard from './pages/Dashboard/SearchDashboard';
import SavedListsPage from './pages/Dashboard/SavedListsPage.jsx';
import EmailTemplatesPage from './pages/Dashboard/EmailTemplatesPage.jsx';
import OutreachHistoryPage from './pages/Dashboard/OutreachHistoryPage';
import SearchHistoryPage from './pages/Dashboard/SearchHistoryPage';
import SubscriptionPage from './pages/Dashboard/SubscriptionPage';
import AnalyticsPage from './pages/Dashboard/AnalyticsPage.jsx';

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
            <Route path="/waitlist" element={<LandingPage />} />

            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />

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
              <Route path="saved-lists" element={<SavedListsPage />} />
              <Route path="email-templates" element={<EmailTemplatesPage />} />
              <Route path="outreach-history" element={<OutreachHistoryPage />} />
              <Route path="search-history" element={<SearchHistoryPage />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
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