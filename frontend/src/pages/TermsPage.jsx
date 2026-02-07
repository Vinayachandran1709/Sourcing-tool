import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const TermsPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Outfit', sans-serif" }}>
      <Navbar />
      
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '120px 20px 60px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#1a1a1a', fontWeight: '700' }}>
          Terms and Conditions
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '40px', fontSize: '1rem' }}>
          Last updated: January 15, 2026
        </p>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            1. Agreement to Terms
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            By accessing or using TalentBox ("Service"), you agree to be bound by these Terms and Conditions. 
            If you disagree with any part of these terms, you may not access the Service.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            2. Description of Service
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            TalentBox is a developer sourcing and recruitment platform that helps companies discover and 
            contact software developers through GitHub profile analysis and automated outreach tools.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            3. Free Trial and Subscription
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            <strong>Free Trial:</strong> We offer a 14-day free trial with limited features (25 searches, 40 profile unlocks, 15 emails).
            No credit card required.
          </p>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            <strong>Starter Plan:</strong> $79/month, billed monthly. Includes 300 profile views/month, unlimited searches, 
            300 emails/month, and advanced features.
          </p>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            You may cancel your subscription at any time. Upon cancellation, you will retain access until the end 
            of your billing period. See our <Link to="/refund-policy" style={{ color: '#FF6B35', textDecoration: 'none', fontWeight: '600' }}>Refund Policy</Link> for details on money-back guarantees.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            4. Acceptable Use
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            You agree NOT to use TalentBox to:
          </p>
          <ul style={{ lineHeight: '1.9', marginLeft: '25px', color: '#374151', fontSize: '1.0625rem' }}>
            <li>Send spam or unsolicited bulk emails</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Harass, abuse, or harm individuals</li>
            <li>Scrape or misuse developer data beyond intended recruitment purposes</li>
            <li>Share your account credentials with others</li>
            <li>Reverse engineer or attempt to extract source code</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            5. Data and Privacy
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            We collect and process data as described in our <Link to="/privacy-policy" style={{ color: '#FF6B35', textDecoration: 'none', fontWeight: '600' }}>Privacy Policy</Link>. 
            Developer data is sourced from public GitHub profiles in compliance with GitHub's Terms of Service.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            6. Usage Limits
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            Each plan includes specific usage limits (searches, profile views, emails). Exceeding these limits 
            may result in temporary restriction of features until the next billing cycle or upgrade to a higher plan.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            7. Intellectual Property
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            The Service, including all content, features, and functionality, is owned by TalentBox and protected 
            by international copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            8. Disclaimer of Warranties
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. We do not 
            guarantee uninterrupted access, accuracy of developer data, or specific recruitment outcomes.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            9. Limitation of Liability
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            TalentBox shall not be liable for any indirect, incidental, special, consequential, or punitive damages 
            resulting from your use of the Service. Our total liability shall not exceed the amount you paid in the 
            last 12 months.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            10. Termination
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            We reserve the right to terminate or suspend your account immediately, without prior notice, for 
            violations of these Terms. You may terminate your account at any time through account settings.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            11. Changes to Terms
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            We may modify these Terms at any time. We will notify you of significant changes via email. 
            Continued use of the Service after changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            12. Governing Law
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            These Terms shall be governed by the laws of India. Any disputes shall be resolved in the courts 
            of Chennai, Tamil Nadu.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            13. Contact Us
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            For questions about these Terms, please contact us at:<br />
            Email: support@talentbox.co
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

export default TermsPage;