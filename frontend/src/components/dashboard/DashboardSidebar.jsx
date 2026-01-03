import React from 'react';
import { NavLink } from 'react-router-dom';
import { Search, Mail, Clock, CreditCard, Package, Folder, Send, BarChart3 } from 'lucide-react';

const DashboardSidebar = () => {
  const navItems = [
    {
      name: 'Search',
      path: '/dashboard/search',
      icon: Search,
      description: 'Find developers'
    },
    {
      name: 'Saved Lists',
      path: '/dashboard/saved-lists',
      icon: Folder,
      description: 'Your shortlists'
    },
    {
      name: 'Email Templates',
      path: '/dashboard/email-templates',
      icon: Mail,
      description: 'Outreach templates'
    },
    {
      name: 'Outreach History',
      path: '/dashboard/outreach-history',
      icon: Send,
      description: 'Email campaigns'
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
      {/* Logo Section */}
      <div style={styles.logoSection}>
        <div style={styles.logoIcon}>
          <Package size={28} color="#FF6B35" />
        </div>
        <div style={styles.logoText}>
          <span style={styles.logoName}>TalentBox</span>
          <span style={styles.logoTagline}>Developer Sourcing</span>
        </div>
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
              <div style={styles.navItemIcon}>
                <Icon size={20} />
              </div>
              <div style={styles.navItemContent}>
                <span style={styles.navItemName}>{item.name}</span>
                <span style={styles.navItemDesc}>{item.description}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerText}>
          TalentBox MVP v1.0
        </div>
        <div style={styles.footerLinks}>
          <a href="/contact" style={styles.footerLink}>Support</a>
          <span style={styles.footerDivider}>•</span>
          <a href="/pricing" style={styles.footerLink}>Pricing</a>
        </div>
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    width: '260px',
    height: '100vh',
    background: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    fontFamily: "'Outfit', sans-serif",
    overflowY: 'auto',
  },

  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    padding: '1.5rem 1.25rem',
    borderBottom: '1px solid #e5e7eb',
  },

  logoIcon: {
    width: '42px',
    height: '42px',
    background: '#fff5f2',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoText: {
    display: 'flex',
    flexDirection: 'column',
  },

  logoName: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 1.2,
  },

  logoTagline: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.125rem',
  },

  nav: {
    flex: 1,
    padding: '1rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },

  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    textDecoration: 'none',
    color: '#6b7280',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },

  navItemActive: {
    background: '#fff5f2',
    color: '#FF6B35',
  },

  navItemIcon: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  navItemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
  },

  navItemName: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    lineHeight: 1.2,
  },

  navItemDesc: {
    fontSize: '0.75rem',
    opacity: 0.7,
  },

  footer: {
    padding: '1.25rem',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },

  footerText: {
    fontSize: '0.8125rem',
    color: '#9ca3af',
    fontWeight: '500',
  },

  footerLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },

  footerLink: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },

  footerDivider: {
    color: '#d1d5db',
    fontSize: '0.75rem',
  },
};

// Hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  a[style*="navItem"]:hover {
    background: #f9fafb !important;
  }
  
  a[style*="navItemActive"]:hover {
    background: #fff5f2 !important;
  }
  
  a[style*="footerLink"]:hover {
    color: #FF6B35 !important;
  }
`;
document.head.appendChild(styleSheet);

export default DashboardSidebar;