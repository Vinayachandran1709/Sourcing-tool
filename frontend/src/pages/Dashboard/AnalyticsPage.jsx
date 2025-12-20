import React, { useState, useEffect } from 'react';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { TrendingUp, TrendingDown, Users, Mail, Search, Eye, Calendar, Target, Activity } from 'lucide-react';

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d, all
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const mockAnalytics = {
        overview: {
          total_searches: 47,
          total_profile_views: 234,
          total_emails_sent: 89,
          total_saved_lists: 5,
          avg_response_rate: 42.5,
          total_profiles_contacted: 89,
        },
        searches_trend: [
          { date: '2024-12-14', count: 3 },
          { date: '2024-12-15', count: 7 },
          { date: '2024-12-16', count: 5 },
          { date: '2024-12-17', count: 8 },
          { date: '2024-12-18', count: 12 },
          { date: '2024-12-19', count: 9 },
          { date: '2024-12-20', count: 3 },
        ],
        profile_views_trend: [
          { date: '2024-12-14', count: 18 },
          { date: '2024-12-15', count: 42 },
          { date: '2024-12-16', count: 31 },
          { date: '2024-12-17', count: 38 },
          { date: '2024-12-18', count: 52 },
          { date: '2024-12-19', count: 44 },
          { date: '2024-12-20', count: 9 },
        ],
        top_roles_searched: [
          { role: 'Senior Python Developer', count: 12 },
          { role: 'Frontend Developer', count: 9 },
          { role: 'Full Stack Developer', count: 8 },
          { role: 'DevOps Engineer', count: 7 },
          { role: 'Data Scientist', count: 6 },
        ],
        top_locations_searched: [
          { location: 'San Francisco, CA', count: 15 },
          { location: 'New York, NY', count: 11 },
          { location: 'Austin, TX', count: 8 },
          { location: 'Seattle, WA', count: 7 },
          { location: 'Remote', count: 6 },
        ],
        email_performance: {
          total_sent: 89,
          total_opened: 54,
          total_replied: 38,
          total_bounced: 2,
          open_rate: 60.7,
          reply_rate: 42.7,
          bounce_rate: 2.2,
        },
        developer_score_distribution: [
          { range: '0-20', count: 5 },
          { range: '21-40', count: 18 },
          { range: '41-60', count: 45 },
          { range: '61-80', count: 89 },
          { range: '81-100', count: 77 },
        ],
      };

      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrend = (data) => {
    if (data.length < 2) return null;
    const latest = data[data.length - 1].count;
    const previous = data[data.length - 2].count;
    const change = ((latest - previous) / previous) * 100;
    return { value: Math.abs(change).toFixed(1), isPositive: change > 0 };
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <DashboardHeader title="Analytics" subtitle="Track your hiring performance" />
        <div style={styles.loading}>
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  const searchesTrend = getTrend(analytics.searches_trend);
  const viewsTrend = getTrend(analytics.profile_views_trend);

  return (
    <div style={styles.page}>
      <DashboardHeader title="Analytics" subtitle="Track your hiring performance and insights" />

      <div style={styles.container}>
        {/* Time Range Filter */}
        <div style={styles.filterBar}>
          <div style={styles.filterButtons}>
            <button
              onClick={() => setTimeRange('7d')}
              style={{
                ...styles.filterBtn,
                ...(timeRange === '7d' ? styles.filterBtnActive : {})
              }}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              style={{
                ...styles.filterBtn,
                ...(timeRange === '30d' ? styles.filterBtnActive : {})
              }}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setTimeRange('90d')}
              style={{
                ...styles.filterBtn,
                ...(timeRange === '90d' ? styles.filterBtnActive : {})
              }}
            >
              Last 90 Days
            </button>
            <button
              onClick={() => setTimeRange('all')}
              style={{
                ...styles.filterBtn,
                ...(timeRange === 'all' ? styles.filterBtnActive : {})
              }}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <div style={{...styles.statIcon, background: '#eff6ff'}}>
                <Search size={24} color="#3b82f6" />
              </div>
              {searchesTrend && (
                <div style={{
                  ...styles.trendBadge,
                  background: searchesTrend.isPositive ? '#d1fae5' : '#fee2e2',
                  color: searchesTrend.isPositive ? '#065f46' : '#991b1b'
                }}>
                  {searchesTrend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{searchesTrend.value}%</span>
                </div>
              )}
            </div>
            <div style={styles.statValue}>{analytics.overview.total_searches}</div>
            <div style={styles.statLabel}>Total Searches</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <div style={{...styles.statIcon, background: '#f0fdf4'}}>
                <Eye size={24} color="#10b981" />
              </div>
              {viewsTrend && (
                <div style={{
                  ...styles.trendBadge,
                  background: viewsTrend.isPositive ? '#d1fae5' : '#fee2e2',
                  color: viewsTrend.isPositive ? '#065f46' : '#991b1b'
                }}>
                  {viewsTrend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{viewsTrend.value}%</span>
                </div>
              )}
            </div>
            <div style={styles.statValue}>{analytics.overview.total_profile_views}</div>
            <div style={styles.statLabel}>Profile Views</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <div style={{...styles.statIcon, background: '#fff7ed'}}>
                <Mail size={24} color="#f59e0b" />
              </div>
            </div>
            <div style={styles.statValue}>{analytics.overview.total_emails_sent}</div>
            <div style={styles.statLabel}>Emails Sent</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <div style={{...styles.statIcon, background: '#faf5ff'}}>
                <Target size={24} color="#a855f7" />
              </div>
            </div>
            <div style={styles.statValue}>{analytics.overview.avg_response_rate}%</div>
            <div style={styles.statLabel}>Response Rate</div>
          </div>
        </div>

        {/* Charts Row */}
        <div style={styles.chartsRow}>
          {/* Searches Trend */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Searches Over Time</h3>
            <div style={styles.barChart}>
              {analytics.searches_trend.map((item, index) => {
                const maxCount = Math.max(...analytics.searches_trend.map(d => d.count));
                const height = (item.count / maxCount) * 100;
                return (
                  <div key={index} style={styles.barWrapper}>
                    <div 
                      style={{
                        ...styles.bar,
                        height: height + '%',
                        background: 'linear-gradient(180deg, #3b82f6, #60a5fa)'
                      }}
                    >
                      <span style={styles.barValue}>{item.count}</span>
                    </div>
                    <div style={styles.barLabel}>
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Profile Views Trend */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Profile Views Over Time</h3>
            <div style={styles.barChart}>
              {analytics.profile_views_trend.map((item, index) => {
                const maxCount = Math.max(...analytics.profile_views_trend.map(d => d.count));
                const height = (item.count / maxCount) * 100;
                return (
                  <div key={index} style={styles.barWrapper}>
                    <div 
                      style={{
                        ...styles.bar,
                        height: height + '%',
                        background: 'linear-gradient(180deg, #10b981, #34d399)'
                      }}
                    >
                      <span style={styles.barValue}>{item.count}</span>
                    </div>
                    <div style={styles.barLabel}>
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lists Row */}
        <div style={styles.listsRow}>
          {/* Top Roles */}
          <div style={styles.listCard}>
            <h3 style={styles.listTitle}>Top Roles Searched</h3>
            <div style={styles.rankingList}>
              {analytics.top_roles_searched.map((item, index) => (
                <div key={index} style={styles.rankingItem}>
                  <div style={styles.rankingRank}>{index + 1}</div>
                  <div style={styles.rankingName}>{item.role}</div>
                  <div style={styles.rankingCount}>{item.count} searches</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Locations */}
          <div style={styles.listCard}>
            <h3 style={styles.listTitle}>Top Locations Searched</h3>
            <div style={styles.rankingList}>
              {analytics.top_locations_searched.map((item, index) => (
                <div key={index} style={styles.rankingItem}>
                  <div style={styles.rankingRank}>{index + 1}</div>
                  <div style={styles.rankingName}>{item.location}</div>
                  <div style={styles.rankingCount}>{item.count} searches</div>
                </div>
              ))}
            </div>
          </div>

          {/* Email Performance */}
          <div style={styles.listCard}>
            <h3 style={styles.listTitle}>Email Performance</h3>
            <div style={styles.emailStats}>
              <div style={styles.emailStat}>
                <div style={styles.emailStatLabel}>Open Rate</div>
                <div style={styles.emailStatValue}>{analytics.email_performance.open_rate}%</div>
                <div style={styles.progressBar}>
                  <div style={{...styles.progressFill, width: analytics.email_performance.open_rate + '%', background: '#3b82f6'}} />
                </div>
              </div>
              <div style={styles.emailStat}>
                <div style={styles.emailStatLabel}>Reply Rate</div>
                <div style={styles.emailStatValue}>{analytics.email_performance.reply_rate}%</div>
                <div style={styles.progressBar}>
                  <div style={{...styles.progressFill, width: analytics.email_performance.reply_rate + '%', background: '#10b981'}} />
                </div>
              </div>
              <div style={styles.emailStat}>
                <div style={styles.emailStatLabel}>Bounce Rate</div>
                <div style={styles.emailStatValue}>{analytics.email_performance.bounce_rate}%</div>
                <div style={styles.progressBar}>
                  <div style={{...styles.progressFill, width: analytics.email_performance.bounce_rate + '%', background: '#ef4444'}} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Developer Score Distribution */}
        <div style={styles.fullWidthCard}>
          <h3 style={styles.chartTitle}>Developer Score Distribution</h3>
          <div style={styles.distributionChart}>
            {analytics.developer_score_distribution.map((item, index) => {
              const maxCount = Math.max(...analytics.developer_score_distribution.map(d => d.count));
              const width = (item.count / maxCount) * 100;
              return (
                <div key={index} style={styles.distributionRow}>
                  <div style={styles.distributionLabel}>{item.range}</div>
                  <div style={styles.distributionBarWrapper}>
                    <div
                      style={{
                        ...styles.distributionBar,
                        width: width + '%',
                        background: index === 4 ? '#10b981' : index === 3 ? '#3b82f6' : index === 2 ? '#f59e0b' : '#6b7280'
                      }}
                    />
                  </div>
                  <div style={styles.distributionCount}>{item.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
  },

  container: {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '2rem',
  },

  filterBar: {
    marginBottom: '2rem',
  },

  filterButtons: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.375rem',
    background: '#fff',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    width: 'fit-content',
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

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },

  statCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
  },

  statHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },

  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  trendBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.375rem 0.625rem',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: '600',
  },

  statValue: {
    fontSize: '2.25rem',
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 1,
    marginBottom: '0.5rem',
  },

  statLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500',
  },

  chartsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },

  chartCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
  },

  chartTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1.5rem',
  },

  barChart: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '0.75rem',
    height: '200px',
    padding: '1rem 0',
  },

  barWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
  },

  bar: {
    width: '100%',
    borderRadius: '6px 6px 0 0',
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '0.5rem',
    transition: 'all 0.3s ease',
  },

  barValue: {
    fontSize: '0.8125rem',
    fontWeight: '700',
    color: '#fff',
  },

  barLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.5rem',
    textAlign: 'center',
  },

  listsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },

  listCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
  },

  listTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '1.5rem',
  },

  rankingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },

  rankingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    background: '#f9fafb',
    borderRadius: '8px',
  },

  rankingRank: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#FF6B35',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    fontWeight: '700',
    flexShrink: 0,
  },

  rankingName: {
    flex: 1,
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  rankingCount: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    fontWeight: '500',
  },

  emailStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },

  emailStat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },

  emailStatLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
  },

  emailStatValue: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1a1a1a',
  },

  progressBar: {
    height: '8px',
    background: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  },

  fullWidthCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
  },

  distributionChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },

  distributionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },

  distributionLabel: {
    width: '80px',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
  },

  distributionBarWrapper: {
    flex: 1,
    height: '32px',
    background: '#f3f4f6',
    borderRadius: '6px',
    overflow: 'hidden',
  },

  distributionBar: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.5s ease',
  },

  distributionCount: {
    width: '60px',
    textAlign: 'right',
    fontSize: '0.9375rem',
    fontWeight: '700',
    color: '#1a1a1a',
  },

  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5rem 2rem',
    gap: '1.5rem',
    color: '#6b7280',
  },
};

export default AnalyticsPage;