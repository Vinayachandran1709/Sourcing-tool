import React, { useState, useEffect } from 'react';
import { History, Mail, Search, Calendar } from 'lucide-react';
import { getOutreachHistory, getSearchHistory } from '../services/api';

const HistoryPage = () => {
  const [activeTab, setActiveTab] = useState('outreach');
  const [outreachHistory, setOutreachHistory] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [activeTab]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      if (activeTab === 'outreach') {
        const data = await getOutreachHistory();
        setOutreachHistory(data.outreach_history || []);
      } else {
        const data = await getSearchHistory();
        setSearchHistory(data.search_history || []);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>History</h1>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('outreach')}
          style={{
            ...styles.tab,
            ...(activeTab === 'outreach' ? styles.activeTab : {}),
          }}
        >
          <Mail size={18} />
          <span>Outreach History</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          style={{
            ...styles.tab,
            ...(activeTab === 'search' ? styles.activeTab : {}),
          }}
        >
          <Search size={18} />
          <span>Search History</span>
        </button>
      </div>

      {loading && <div style={styles.loading}>Loading history...</div>}

      {!loading && activeTab === 'outreach' && (
        <div style={styles.historyList}>
          {outreachHistory.length === 0 ? (
            <div style={styles.empty}>
              <Mail size={48} color="#9ca3af" />
              <p>No outreach history yet</p>
            </div>
          ) : (
            outreachHistory.map((item) => (
              <div key={item.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.cardTitle}>{item.subject}</h3>
                    <p style={styles.cardSubtitle}>
                      To: {item.profile.name || item.profile.github_username} (@{item.profile.github_username})
                    </p>
                  </div>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: item.status === 'sent' ? '#d1fae5' : '#fee2e2',
                    color: item.status === 'sent' ? '#065f46' : '#991b1b',
                  }}>
                    {item.status}
                  </span>
                </div>
                <div style={styles.cardDate}>
                  <Calendar size={14} />
                  <span>{new Date(item.sent_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!loading && activeTab === 'search' && (
        <div style={styles.historyList}>
          {searchHistory.length === 0 ? (
            <div style={styles.empty}>
              <Search size={48} color="#9ca3af" />
              <p>No search history yet</p>
            </div>
          ) : (
            searchHistory.map((item) => (
              <div key={item.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.cardTitle}>
                      {item.filters.language} developers
                      {item.filters.location && ` in ${item.filters.location}`}
                    </h3>
                    <p style={styles.cardSubtitle}>
                      Found {item.profiles_found} profiles
                      {item.filters.min_repos > 0 && ` • Min repos: ${item.filters.min_repos}`}
                    </p>
                  </div>
                </div>
                <div style={styles.cardDate}>
                  <Calendar size={14} />
                  <span>{new Date(item.searched_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' },
  title: { fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid #e5e7eb' },
  tab: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.5rem', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', color: '#6b7280', fontSize: '1rem', fontWeight: '500', transition: 'all 0.2s' },
  activeTab: { color: '#4f46e5', borderBottomColor: '#4f46e5' },
  loading: { textAlign: 'center', padding: '3rem', fontSize: '1.125rem', color: '#6b7280' },
  empty: { textAlign: 'center', padding: '4rem', color: '#6b7280' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  card: { backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },
  cardTitle: { fontSize: '1.125rem', fontWeight: '600', margin: 0 },
  cardSubtitle: { color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' },
  badge: { padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '500' },
  cardDate: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' },
};

export default HistoryPage;