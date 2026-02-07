import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PrivacyPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Outfit', sans-serif" }}>
      <Navbar />
      
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '120px 20px 60px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#1a1a1a', fontWeight: '700' }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '40px', fontSize: '1rem' }}>
          Last updated: January 15, 2026
        </p>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            1. Introduction
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            TalentBox ("we," "our," or "us") respects your privacy and is committed to protecting your personal data. 
            This Privacy Policy explains how we collect, use, and safeguard your information when you use our Service.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            2. Information We Collect
          </h2>
          
          <h3 style={{ fontSize: '1.25rem', marginBottom: '10px', marginTop: '25px', color: '#1a1a1a', fontWeight: '600' }}>
            2.1 Information You Provide
          </h3>
          <ul style={{ lineHeight: '1.9', marginLeft: '25px', marginBottom: '20px', color: '#374151', fontSize: '1.0625rem' }}>
            <li><strong>Account Information:</strong> Name, email address, company name</li>
            <li><strong>Payment Information:</strong> Processed securely through Razorpay (we do not store credit card details)</li>
            <li><strong>Email Outreach:</strong> Your sender email address and custom email templates</li>
            <li><strong>Usage Data:</strong> Search queries, profile views, emails sent</li>
          </ul>

          <h3 style={{ fontSize: '1.25rem', marginBottom: '10px', marginTop: '25px', color: '#1a1a1a', fontWeight: '600' }}>
            2.2 Information We Collect Automatically
          </h3>
          <ul style={{ lineHeight: '1.9', marginLeft: '25px', marginBottom: '20px', color: '#374151', fontSize: '1.0625rem' }}>
            <li><strong>Log Data:</strong> IP address, browser type, device information</li>
            <li><strong>Cookies:</strong> Authentication tokens, session management</li>
            <li><strong>Usage Analytics:</strong> Feature usage, search patterns, engagement metrics</li>
          </ul>

          <h3 style={{ fontSize: '1.25rem', marginBottom: '10px', marginTop: '25px', color: '#1a1a1a', fontWeight: '600' }}>
            2.3 Developer Data from GitHub
          </h3>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            We collect publicly available developer information from GitHub using their API, including:
          </p>
          <ul style={{ lineHeight: '1.9', marginLeft: '25px', color: '#374151', fontSize: '1.0625rem' }}>
            <li>Public profile information (username, name, bio, location)</li>
            <li>Repository information (languages, stars, contributions)</li>
            <li>Public activity (commits, pull requests)</li>
          </ul>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', marginTop: '20px', color: '#374151', fontSize: '1.0625rem' }}>
            This data is sourced in compliance with GitHub's Terms of Service and only includes publicly accessible information.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            3. How We Use Your Information
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            We use collected information to:
          </p>
          <ul style={{ lineHeight: '1.9', marginLeft: '25px', color: '#374151', fontSize: '1.0625rem' }}>
            <li>Provide and maintain our Service</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send service-related emails and notifications</li>
            <li>Improve and personalize user experience</li>
            <li>Analyze usage patterns and optimize features</li>
            <li>Detect and prevent fraud or abuse</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            4. Data Sharing and Disclosure
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            We do not sell your personal information. We may share data with:
          </p>
          <ul style={{ lineHeight: '1.9', marginLeft: '25px', color: '#374151', fontSize: '1.0625rem' }}>
            <li><strong>Service Providers:</strong> Razorpay (payment processing), Neon (database hosting), Railway (application hosting)</li>
            <li><strong>GitHub:</strong> API requests for developer data (public information only)</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            5. Data Security
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            We implement industry-standard security measures:
          </p>
          <ul style={{ lineHeight: '1.9', marginLeft: '25px', marginBottom: '20px', color: '#374151', fontSize: '1.0625rem' }}>
            <li>Encrypted data transmission (HTTPS/SSL)</li>
            <li>Secure password hashing (bcrypt)</li>
            <li>JWT-based authentication</li>
            <li>Regular security audits</li>
            <li>Access controls and monitoring</li>
          </ul>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            6. Data Retention
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            We retain your personal data for as long as your account is active or as needed to provide services. 
            After account deletion, we may retain certain information for legal compliance, fraud prevention, 
            and backup purposes (up to 90 days).
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            7. Your Rights
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            You have the right to:
          </p>
          <ul style={{ lineHeight: '1.9', marginLeft: '25px', marginBottom: '20px', color: '#374151', fontSize: '1.0625rem' }}>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
            <li><strong>Export:</strong> Download your data in a portable format</li>
            <li><strong>Opt-out:</strong> Unsubscribe from marketing emails</li>
          </ul>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            To exercise these rights, contact us at privacy@talentbox.co
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            8. Cookies and Tracking
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            We use essential cookies for authentication and session management. We do not use third-party 
            advertising cookies. You can disable cookies in your browser, but this may affect functionality.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            9. Children's Privacy
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            Our Service is not intended for individuals under 18 years of age. We do not knowingly collect 
            personal information from children.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            10. Contact Us
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            For privacy-related questions, contact us at:<br />
            Email: privacy@talentbox.co<br />
            Support: support@talentbox.co
          </p>
        </section>

        <div style={{ marginTop: '60px', paddingTop: '30px', borderTop: '2px solid #f3f4f6', textAlign: 'center' }}>
          <Link to="/" style={{ 
            color: '#FF6B35', 
            textDecoration: 'none', 
            marginRight: '30px',
            fontSize: '1.0625rem',
            fontWeight: '600'
          }}>
            ← Back to Home
          </Link>
          <Link to="/signup" style={{ 
            color: '#FF6B35', 
            textDecoration: 'none',
            fontSize: '1.0625rem',
            fontWeight: '600'
          }}>
            Start Free Trial →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPage;