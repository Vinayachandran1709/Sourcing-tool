import React, { useState } from 'react';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import SearchFilters from '../../components/SearchFilters';
import ProfileCard from '../../components/ProfileCard';
import { searchDevelopers, toggleProfileSelection } from '../../services/api';
import { Search, TrendingUp, Users, Star } from 'lucide-react';

const SearchDashboard = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const handleSearch = async (filters) => {
    setLoading(true);
    try {
      const data = await searchDevelopers(filters);
      setProfiles(data.profiles || []);
      setStats({ 
        total: data.total_found, 
        fromCache: data.from_cache, 
        fromGithub: data.from_github 
      });
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = async (profileId) => {
    try {
      await toggleProfileSelection(profileId);
      setProfiles(prev => 
        prev.map(p => p.id === profileId ? {...p, selected: !p.selected} : p)
      );
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  return (
    <div style={styles.page}>
      <DashboardHeader 
        title="Search Developers" 
        subtitle="Find the perfect developers for your team"
      />

      <div style={styles.content}>
        {/* Stats Cards - Show after search */}
        {stats && (
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={{...styles.statIcon, background: '#eff6ff'}}>
                <Users size={24} color="#3b82f6" />
              </div>
              <div style={styles.statContent}>
                <div style={styles.statValue}>{stats.total}</div>
                <div style={styles.statLabel}>Total Found</div>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={{...styles.statIcon, background: '#f0fdf4'}}>
                <TrendingUp size={24} color="#10b981" />
              </div>
              <div style={styles.statContent}>
                <div style={styles.statValue}>{stats.fromCache}</div>
                <div style={styles.statLabel}>From Cache</div>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={{...styles.statIcon, background: '#fff7ed'}}>
                <Star size={24} color="#f59e0b" />
              </div>
              <div style={styles.statContent}>
                <div style={styles.statValue}>{stats.fromGithub}</div>
                <div style={styles.statLabel}>Fresh from GitHub</div>
              </div>
            </div>
          </div>
        )}

        {/* Search Filters */}
        <SearchFilters onSearch={handleSearch} loading={loading} />

        {/* Loading State */}
        {loading && (
          <div style={styles.loading}>
            <div className="spinner"></div>
            <p style={styles.loadingText}>Searching for developers...</p>
          </div>
        )}

        {/* Results Grid */}
        {!loading && profiles.length > 0 && (
          <div style={styles.resultsSection}>
            <div style={styles.resultsHeader}>
              <h3 style={styles.resultsTitle}>
                Search Results ({profiles.length})
              </h3>
            </div>
            <div style={styles.profilesGrid}>
              {profiles.map(profile => (
                <ProfileCard 
                  key={profile.id} 
                  profile={profile} 
                  onToggleSelect={handleToggleSelect} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !stats && (
          <div style={styles.emptyState}>
            <Search size={64} color="#d1d5db" />
            <h3 style={styles.emptyTitle}>Start Your Search</h3>
            <p style={styles.emptyText}>
              Use the filters above to find developers that match your needs
            </p>
          </div>
        )}

        {/* No Results */}
        {!loading && stats && profiles.length === 0 && (
          <div style={styles.emptyState}>
            <Search size={64} color="#d1d5db" />
            <h3 style={styles.emptyTitle}>No Developers Found</h3>
            <p style={styles.emptyText}>
              Try adjusting your search filters
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
    transition: 'all 0.3s',
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

  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    gap: '1.5rem',
  },

  loadingText: {
    fontSize: '1.125rem',
    color: '#6b7280',
    fontWeight: '500',
  },

  resultsSection: {
    marginTop: '2rem',
  },

  resultsHeader: {
    marginBottom: '1.5rem',
  },

  resultsTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1a1a1a',
  },

  profilesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
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

export default SearchDashboard;