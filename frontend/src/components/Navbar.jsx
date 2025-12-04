import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Mail, History } from 'lucide-react';

const Navbar = () => {
  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        <Link to="/app/search" style={styles.logo}>
          <Search size={24} />
          <span>Developer Sourcing Tool</span>
        </Link>
        <div style={styles.links}>
          <Link to="/app/search" style={styles.link}>
            <Search size={18} />
            <span>Search</span>
          </Link>
          <Link to="/app/outreach" style={styles.link}>
            <Mail size={18} />
            <span>Email Outreach</span>
          </Link>
          <Link to="/app/history" style={styles.link}>
            <History size={18} />
            <span>History</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

const styles = {
  navbar: { backgroundColor: '#1a1a2e', padding: '1rem 0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', textDecoration: 'none', fontSize: '1.25rem', fontWeight: 'bold' },
  links: { display: 'flex', gap: '2rem' },
  link: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ccc', textDecoration: 'none', fontSize: '1rem', transition: 'color 0.3s' },
};

export default Navbar;