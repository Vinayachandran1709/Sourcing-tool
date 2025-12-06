import React from 'react';
import { NavLink } from 'react-router-dom';
import { Search, Mail, History, Clock, CreditCard, Package } from 'lucide-react';

const DashboardSidebar = () => {
  const navItems = [
    {
      name: 'Search',
      path: '/dashboard/search',
      icon: Search,
      description: 'Find developers'
    },
    {
      name: 'Outreach History',
      path: '/dashboard/outreach-history',
      icon: Mail,
      description: 'Email campaigns'
    },
    {
      name: 'Search History',
      path: '/dashboard/search-history',
      icon: Clock,
      description: 'Past searches'
    },
    {
      name: 'Subscription',
      path: '/dashboard/subscription',
      icon: CreditCard,
      description: 'Plan & usage'
    }
  ];

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <Package size={28} color="#FF6B35" />
        <span style={styles.logoText}>TalentBox</span>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {})
              })}
            >
              <Icon size={20} />
              <div style={styles.navItemText}>
                <div style={styles.navItemName}>{item.name}</div>
                <div style={styles.navItemDesc}>{item.description}</div>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>TalentBox v1.0</div>
        <div style={styles.footerLinks}>
          <a href="https://twitter.com/talentbox" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>
            Twitter
          </a>
          <a href="https://linkedin.com/company/talentbox" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>
            LinkedIn
          </a>
        </div>
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    width: '260px',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    background: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Outfit', sans-serif",
  },

  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '1.5rem 1.25rem',
    borderBottom: '1px solid #f3f4f6',
  },

  logoText: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1a1a1a',
  },

  nav: {
    flex: 1,
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    overflowY: 'auto',
  },

  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    padding: '0.875rem 1rem',
    borderRadius: '10px',
    textDecoration: 'none',
    color: '#6b7280',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },

  navItemActive: {
    background: '#fff5f2',
    color: '#FF6B35',
    fontWeight: '600',
  },

  navItemText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  navItemName: {
    fontSize: '0.9375rem',
    fontWeight: '600',
  },

  navItemDesc: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },

  footer: {
    padding: '1.25rem',
    borderTop: '1px solid #f3f4f6',
  },

  footerText: {
    fontSize: '0.8125rem',
    color: '#9ca3af',
    marginBottom: '0.75rem',
  },

  footerLinks: {
    display: 'flex',
    gap: '1rem',
  },

  footerLink: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
};

// Add hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  a[style*="navItem"]:hover:not([style*="navItemActive"]) {
    background: #f9fafb !important;
    color: #1a1a1a !important;
  }
  
  a[style*="footerLink"]:hover {
    color: #FF6B35 !important;
  }
`;
document.head.appendChild(styleSheet);

export default DashboardSidebar;