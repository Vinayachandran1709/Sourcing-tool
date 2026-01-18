import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const RefundPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Outfit', sans-serif" }}>
      <Navbar />
      
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '120px 20px 60px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#1a1a1a', fontWeight: '700' }}>
          Refund Policy
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '40px', fontSize: '1rem' }}>
          Last updated: January 15, 2026
        </p>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            1. 14-Day Money-Back Guarantee
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            We offer a <strong>14-day money-back guarantee</strong> for all new Starter plan subscriptions. 
            If you're not satisfied with TalentBox within the first 14 days of your paid subscription, 
            we'll refund your payment in full—no questions asked.
          </p>
          <div style={{ 
            backgroundColor: '#FFF4E6', 
            padding: '20px', 
            borderRadius: '12px', 
            marginTop: '20px',
            borderLeft: '4px solid #FF6B35'
          }}>
            <p style={{ lineHeight: '1.8', color: '#1a1a1a', fontSize: '1.0625rem', margin: 0 }}>
              <strong>Note:</strong> The 14-day period begins when you first subscribe to a paid plan, not from 
              the start of your free trial.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            2. Free Trial
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            Our 7-day free trial requires no credit card and has no obligation. Since there's no charge during 
            the trial period, refunds do not apply. You can cancel anytime during the trial without being charged.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            3. How to Request a Refund
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            To request a refund within the 14-day window:
          </p>
          <ol style={{ lineHeight: '1.9', marginLeft: '25px', color: '#374151', fontSize: '1.0625rem' }}>
            <li>Email us at <strong>support@talentbox.co</strong></li>
            <li>Include your account email and reason for refund (optional)</li>
            <li>We'll process your refund within 5-7 business days</li>
            <li>Refunds are issued to the original payment method</li>
          </ol>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            4. Cancellations After 14 Days
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            After the 14-day refund window:
          </p>
          <ul style={{ lineHeight: '1.9', marginLeft: '25px', color: '#374151', fontSize: '1.0625rem' }}>
            <li>You can cancel your subscription at any time from your account settings</li>
            <li>You'll retain access until the end of your current billing period</li>
            <li>No refunds are provided for partial months or unused time</li>
            <li>No automatic charges occur after cancellation</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            5. Exceptions to Refund Policy
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            Refunds may be denied if:
          </p>
          <ul style={{ lineHeight: '1.9', marginLeft: '25px', color: '#374151', fontSize: '1.0625rem' }}>
            <li>Request is made after the 14-day period</li>
            <li>Account was terminated for Terms of Service violations</li>
            <li>Evidence of abuse, fraud, or excessive usage is found</li>
            <li>Multiple refund requests from the same user (refund abuse)</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            6. Payment Disputes and Chargebacks
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            Please contact us directly before initiating a chargeback with your bank. Chargebacks filed 
            without prior communication may result in account suspension.
          </p>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            We're committed to resolving any billing issues fairly and promptly.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: '700' }}>
            7. Contact Us
          </h2>
          <p style={{ lineHeight: '1.8', marginBottom: '15px', color: '#374151', fontSize: '1.0625rem' }}>
            Questions about our refund policy or need to request a refund?<br />
            Email: <strong>support@talentbox.co</strong><br />
            We typically respond within 24 hours.
          </p>
        </section>

        <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '2px solid #f3f4f6' }}>
          <div style={{ 
            backgroundColor: '#F0F9FF', 
            padding: '25px', 
            borderRadius: '12px', 
            marginBottom: '30px',
            borderLeft: '4px solid #1E40AF'
          }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', color: '#1E40AF', fontWeight: '700' }}>
              💡 Pro Tip
            </h3>
            <p style={{ lineHeight: '1.8', color: '#1E40AF', fontSize: '1.0625rem', margin: 0 }}>
              Not sure if TalentBox is right for you? Start with our free 7-day trial (no credit card required) 
              to test all features risk-free before committing to a paid plan.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '30px', paddingTop: '30px', borderTop: '2px solid #f3f4f6', textAlign: 'center' }}>
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

export default RefundPage;