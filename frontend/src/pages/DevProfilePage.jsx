import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DevCard from '../components/DevCard';
import { API_BASE_URL } from '../services/api';

const DevProfilePage = () => {
  const { username } = useParams();
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setNotFound(false);
    fetch(`${API_BASE_URL}/api/devcard/${username}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.card) {
          setCardData(data.card);
          document.title = `${data.card.display_name || username} — Developer Profile | TalentBox`;
        } else {
          setNotFound(true);
          document.title = 'DevCard not found | TalentBox';
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Outfit', sans-serif" }}>
      <Navbar />

      <section style={{ padding: '4rem 2rem 5rem' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading DevCard...</p>
            </div>
          )}

          {notFound && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.75rem' }}>DevCard not found</h2>
              <p style={{ fontSize: '1rem', color: '#6b7280', lineHeight: '1.6', marginBottom: '2rem' }}>
                <strong>@{username}</strong> hasn't created a DevCard yet, or it may have been unpublished.
              </p>
              <Link to="/devcard"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#FF6B35', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '15px' }}>
                Create your DevCard →
              </Link>
            </div>
          )}

          {cardData && (
            <>
              <DevCard cardData={cardData} />

              {/* View count */}
              {cardData.views_count > 0 && (
                <p style={{ textAlign: 'center', fontSize: '13px', color: '#9ca3af', marginTop: '1rem' }}>
                  👁 {cardData.views_count} view{cardData.views_count !== 1 ? 's' : ''}
                </p>
              )}

              {/* CTAs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1.5rem' }}>
                <Link to="/devcard"
                  style={{ display: 'block', padding: '12px', background: '#E1F5EE', color: '#085041', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                  Create your own DevCard →
                </Link>
                <Link to="/for-companies"
                  style={{ display: 'block', padding: '12px', background: '#E6F1FB', color: '#0C447C', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                  Hiring developers? Search 200K+ profiles →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default DevProfilePage;
