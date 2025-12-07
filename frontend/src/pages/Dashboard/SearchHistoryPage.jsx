import React, { useState, useEffect } from 'react';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { getSearchHistory } from '../../services/api';
import { Search, Clock, Filter, MapPin, Code, Calendar } from 'lucide-react';

const SearchHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, week, month

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getSearchHistory();
      setHistory(data.search_history || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredHistory = () => {
    if (filter === 'all') return history;
    
    const now = new Date();
    const filtered = history.filter(item => {
      const searchDate = new Date(item.created_at);
      const diffTime = Math.abs(now - searchDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (filter === 'today') return diffDays <= 1;
      if (filter === 'week') return diffDays <= 7;
      if (filter === 'month') return diffDays <= 30;
      return true;
    });
    
    return filtered;
  };

  const filteredHistory = getFilteredHistory();

  return (
    <div style={styles.page}>
      <DashboardHeader 
        title="Search History" 
        subtitle="Review your past developer searches"
      />

      <div style={styles.content}>
        {/* Filter Bar */}
        <div style={styles.filterBar}>
          <div style={styles.filterButtons}>
            <button
              onClick={() => setFilter('all')}
              style={{
                ...styles.filterBtn,
                ...(filter === 'all' ? styles.filterBtnActive : {})
              }}
            >
              All Time
            </button>
            <button
              onClick={() => setFilter('today')}
              style={{
                ...styles.filterBtn,
                ...(filter === 'today' ? styles.filterBtnActive : {})
              }}
            >
              Today
            </button>
            <button
              onClick={() => setFilter('week')}
              style={{
                ...styles.filterBtn,
                ...(filter === 'week' ? styles.filterBtnActive : {})
              }}
            >
              This Week
            </button>
            <button
              onClick={() => setFilter('month')}
              style={{
                ...styles.filterBtn,
                ...(filter === 'month' ? styles.filterBtnActive : {})
              }}
            >
              This Month
            </button>
          </div>

          <div style={styles.statsBox}>
            <Search size={20} color="#6b7280" />
            <span style={styles.statsText}>{filteredHistory.length} searches</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={styles.loading}>
            <div className="spinner"></div>
            <p>Loading search history...</p>
          </div>
        )}

        {/* History List */}
        {!loading && filteredHistory.length > 0 && (
          <div style={styles.historyList}>
            {filteredHistory.map((item) => (
              <div key={item.id} style={styles.historyCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardHeaderLeft}>
                    <div style={styles.iconBox}>
                      <Search size={20} color="#FF6B35" />
                    </div>
                    <div>
                      <h4 style={styles.cardTitle}>Developer Search</h4>
                      <div style={styles.cardDate}>
                        <Calendar size={14} />
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div style={styles.resultsBadge}>
                    {item.results_count} results
                  </div>
                </div>

                <div style={styles.filterTags}>
                  {item.filters.language && (
                    <div style={styles.tag}>
                      <Code size={14} />
                      <span>{item.filters.language}</span>
                    </div>
                  )}
                  {item.filters.location && (
                    <div style={styles.tag}>
                      <MapPin size={14} />
                      <span>{item.filters.location}</span>
                    </div>
                  )}
                  {item.filters.min_repos > 0 && (
                    <div style={styles.tag}>
                      <span>Min Repos: {item.filters.min_repos}</span>
                    </div>
                  )}
                  {item.filters.min_contributions > 0 && (
                    <div style={styles.tag}>
                      <span>Min Contributions: {item.filters.min_contributions}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredHistory.length === 0 && (
          <div style={styles.emptyState}>
            <Clock size={64} color="#d1d5db" />
            <h3 style={styles.emptyTitle}>
              {filter === 'all' ? 'No Search History Yet' : `No searches in ${filter}`}
            </h3>
            <p style={styles.emptyText}>
              {filter === 'all' 
                ? 'Start searching for developers to see your history here'
                : `No searches found for the selected time period`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
  },

  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
  },

  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },

  filterButtons: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.375rem',
    background: '#fff',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
  },

  filterBtn: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.9375rem',
    fontWeight: '600',
    background: 'transparent',
    color: '#6b7280',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: "'Outfit', sans-serif",
  },

  filterBtnActive: {
    background: '#f9fafb',
    color: '#1a1a1a',
  },

  statsBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
  },

  statsText: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    gap: '1.5rem',
    color: '#6b7280',
  },

  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },

  historyCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    transition: 'all 0.2s',
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },

  cardHeaderLeft: {
    display: 'flex',
    gap: '1rem',
    flex: 1,
  },

  iconBox: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    background: '#fff5f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    fontSize: '1.0625rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
  },

  cardDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#9ca3af',
    fontSize: '0.875rem',
    marginTop: '0.25rem',
  },

  resultsBadge: {
    padding: '0.375rem 0.875rem',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: '600',
    background: '#eff6ff',
    color: '#1e40af',
  },

  filterTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },

  tag: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.375rem 0.875rem',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    color: '#6b7280',
    fontWeight: '500',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5rem 2rem',
    textAlign: 'center',
  },

  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: '1.5rem',
  },

  emptyText: {
    fontSize: '1rem',
    color: '#6b7280',
    marginTop: '0.5rem',
    maxWidth: '400px',
  },
};

// Add hover effect
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  div[style*="historyCard"]:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
    transform: translateY(-2px);
  }
`;
document.head.appendChild(styleSheet);

export default SearchHistoryPage;