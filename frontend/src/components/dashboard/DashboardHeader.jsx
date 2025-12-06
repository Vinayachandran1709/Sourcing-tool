import React from 'react';
import { Bell, User, Settings, LogOut } from 'lucide-react';

const DashboardHeader = ({ title, subtitle }) => {
  return (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        {/* Page Title */}
        <div style={styles.titleSection}>
          <h1 style={styles.title}>{title}</h1>
          {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        </div>

        {/* Right Side - User Menu */}
        <div style={styles.rightSection}>
          {/* Notifications */}
          <button style={styles.iconButton}>
            <Bell size={20} />
            <span style={styles.badge}>3</span>
          </button>

          {/* User Menu */}
          <div style={styles.userMenu}>
            <div style={styles.avatar}>
              <User size={18} />
            </div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>Demo User</div>
              <div style={styles.userPlan}>Starter Plan</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const styles = {
  header: {
    height: '70px',
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    fontFamily: "'Outfit', sans-serif",
  },

  headerContent: {
    height: '100%',
    padding: '0 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  titleSection: {
    flex: 1,
  },

  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: 0,
  },

  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '0.25rem 0 0 0',
  },

  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },

  iconButton: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  badge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '18px',
    height: '18px',
    background: '#FF6B35',
    color: '#fff',
    fontSize: '0.6875rem',
    fontWeight: '700',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },

  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
  },

  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },

  userName: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  userPlan: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
};

// Add hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  button[style*="iconButton"]:hover {
    background: #f9fafb !important;
  }
  
  div[style*="userMenu"]:hover {
    background: #f9fafb !important;
  }
`;
document.head.appendChild(styleSheet);

export default DashboardHeader;