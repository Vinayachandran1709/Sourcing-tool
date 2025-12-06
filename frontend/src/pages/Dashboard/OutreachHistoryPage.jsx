import React, { useState, useEffect } from 'react';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { getOutreachHistory } from '../../services/api';
import { Mail, Calendar, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';

const OutreachHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, sent, failed

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getOutreachHistory();
      setHistory(data.outreach_history || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = filter === 'all' 
    ? history 
    : history.filter(item => item.status === filter);

  const stats = {
    total: history.length,
    sent: history.filter(h => h.status === 'sent').length,
    failed: history.filter(h => h.status === 'failed').length,
  };

  return (
    <div style={styles.page}>
      <DashboardHeader 
        title="Outreach History" 
        subtitle="Track all your email campaigns"
      />

      <div style={styles.content}>
        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#eff6ff'}}>
              <Mail size={24} color="#3b82f6" />
            </div>
            <div style={styles.statContent}>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statLabel}>Total Emails</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#f0fdf4'}}>
              <CheckCircle size={24} color="#10b981" />
            </div>
            <div style={styles.statContent}>
              <div style={styles.statValue}>{stats.sent}</div>
              <div style={styles.statLabel}>Successfully Sent</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{...styles.statIcon, background: '#fee2e2'}}>
              <XCircle size={24} color="#ef4444" />
            </div>
            <div style={styles.statContent}>
              <div style={styles.statValue}>{stats.failed}</div>
              <div style={styles.statLabel}>Failed</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filterBar}>
          <div style={styles.filterButtons}>
            <button
              onClick={() => setFilter('all')}
              style={{
                ...styles.filterBtn,
                ...(filter === 'all' ? styles.filterBtnActive : {})
              }}
            >
              All
            </button>
            <button
              onClick={() => setFilter('sent')}
              style={{
                ...styles.filterBtn,
                ...(filter === 'sent' ? styles.filterBtnActive : {})
              }}
            >
              Sent
            </button>
            <button
              onClick={() => setFilter('failed')}
              style={{
                ...styles.filterBtn,
                ...(filter === 'failed' ? styles.filterBtnActive : {})
              }}
            >
              Failed
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={styles.loading}>
            <div className="spinner"></div>
            <p>Loading outreach history...</p>
          </div>
        )}

        {/* History List */}
        {!loading && filteredHistory.length > 0 && (
          <div style={styles.historyList}>
            {filteredHistory.map((item) => (
              <div key={item.id} style={styles.historyCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardHeaderLeft}>
                    <Mail size={20} color="#6b7280" />
                    <div>
                      <h4 style={styles.cardTitle}>{item.subject}</h4>
                      <p style={styles.cardRecipient}>
                        To: {item.profile.name || item.profile.github_username} 
                        <span style={styles.username}>@{item.profile.github_username}</span>
                      </p>
                    </div>
                  </div>
                  <div style={styles.statusBadge(item.status)}>
                    {item.status === 'sent' ? (
                      <CheckCircle size={16} />
                    ) : (
                      <XCircle size={16} />
                    )}
                    <span>{item.status}</span>
                  </div>
                </div>

                <div style={styles.cardDate}>
                  <Calendar size={14} />
                  <span>{new Date(item.sent_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredHistory.length === 0 && (
          <div style={styles.emptyState}>
            <Mail size={64} color="#d1d5db" />
            <h3 style={styles.emptyTitle}>
              {filter === 'all' ? 'No Outreach History Yet' : `No ${filter} emails`}
            </h3>
            <p style={styles.emptyText}>
              {filter === 'all' 
                ? 'Start sending emails to developers from the Search page'
                : `No emails with status "${filter}"`
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

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },

  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
  },

  statIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statContent: {
    flex: 1,
  },

  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 1,
  },

  statLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.375rem',
  },

  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
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

  cardTitle: {
    fontSize: '1.0625rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
  },

  cardRecipient: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },

  username: {
    color: '#9ca3af',
    marginLeft: '0.5rem',
  },

  statusBadge: (status) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.375rem 0.875rem',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: '600',
    background: status === 'sent' ? '#d1fae5' : '#fee2e2',
    color: status === 'sent' ? '#065f46' : '#991b1b',
  }),

  cardDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#9ca3af',
    fontSize: '0.875rem',
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

export default OutreachHistoryPage;