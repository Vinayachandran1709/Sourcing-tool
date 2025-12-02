import React, { useState } from 'react';
import { Search, Loader } from 'lucide-react';

const SearchFilters = ({ onSearch, loading }) => {
  const [filters, setFilters] = useState({
    language: 'python',
    location: '',
    min_repos: 5,
    min_contributions: 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: name.includes('min_') ? parseInt(value) || 0 : value,
    }));
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Search Developers</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Programming Language *</label>
            <input type="text" name="language" value={filters.language} onChange={handleChange} placeholder="e.g., python, javascript, java" style={styles.input} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Location</label>
            <input type="text" name="location" value={filters.location} onChange={handleChange} placeholder="e.g., bangalore, india" style={styles.input} />
          </div>
        </div>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Min Repositories</label>
            <input type="number" name="min_repos" value={filters.min_repos} onChange={handleChange} min="0" style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Min Contributions</label>
            <input type="number" name="min_contributions" value={filters.min_contributions} onChange={handleChange} min="0" style={styles.input} />
          </div>
        </div>
        <button type="submit" disabled={loading} style={{...styles.button, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer'}}>
          {loading ? <><Loader size={20} /><span>Searching...</span></> : <><Search size={20} /><span>Search Developers</span></>}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '2rem' },
  title: { fontSize: '1.5rem', marginBottom: '1.5rem', color: '#1a1a2e' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.875rem', fontWeight: '500', color: '#333' },
  input: { padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' },
  button: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: '500', cursor: 'pointer', marginTop: '0.5rem' },
};

export default SearchFilters;