import React, { useState } from 'react';
import SearchFilters from '../components/SearchFilters';
import ProfileCard from '../components/ProfileCard';
import { searchDevelopers, toggleProfileSelection } from '../services/api';

const SearchPage = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const handleSearch = async (filters) => {
    setLoading(true);
    try {
      const data = await searchDevelopers(filters);
      setProfiles(data.profiles || []);
      setStats({ total: data.total_found, fromCache: data.from_cache, fromGithub: data.from_github });
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Make sure backend is running on http://127.0.0.1:8000');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = async (profileId) => {
    try {
      await toggleProfileSelection(profileId);
      setProfiles(prev => prev.map(p => p.id === profileId ? {...p, selected: !p.selected} : p));
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  return (
    <div style={styles.container}>
      <SearchFilters onSearch={handleSearch} loading={loading} />
      {stats && (
        <div style={styles.stats}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>Total Found</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.fromCache}</div>
            <div style={styles.statLabel}>From Cache</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.fromGithub}</div>
            <div style={styles.statLabel}>From GitHub</div>
          </div>
        </div>
      )}
      {loading && <div style={styles.loading}>Searching for developers...</div>}
      <div style={styles.grid}>
        {profiles.map(profile => (
          <ProfileCard key={profile.id} profile={profile} onToggleSelect={handleToggleSelect} />
        ))}
      </div>
      {!loading && profiles.length === 0 && <div style={styles.empty}>No profiles found. Try searching!</div>}
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' },
  statCard: { backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' },
  statValue: { fontSize: '2rem', fontWeight: 'bold', color: '#4f46e5' },
  statLabel: { fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' },
  loading: { textAlign: 'center', padding: '3rem', fontSize: '1.125rem', color: '#6b7280' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' },
  empty: { textAlign: 'center', padding: '3rem', fontSize: '1.125rem', color: '#6b7280' },
};

export default SearchPage;