import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Public Pages
import HomePage from './pages/HomePage';
import PricingPage from './pages/PricingPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import LandingPage from './pages/LandingPage';

// Dashboard Pages
import DashboardLayout from './components/dashboard/DashboardLayout';
import SearchDashboard from './pages/Dashboard/SearchDashboard';
import OutreachHistoryPage from './pages/Dashboard/OutreachHistoryPage';
import SearchHistoryPage from './pages/Dashboard/SearchHistoryPage';
import SubscriptionPage from './pages/Dashboard/SubscriptionPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/waitlist" element={<LandingPage />} />

          {/* Dashboard Routes (Protected) */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard/search" replace />} />
            <Route path="search" element={<SearchDashboard />} />
            <Route path="search-history" element={<SearchHistoryPage />} />
            <Route path="outreach-history" element={<OutreachHistoryPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
          </Route>

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;