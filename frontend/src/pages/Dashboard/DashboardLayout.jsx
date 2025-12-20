import React from 'react';
import { Outlet } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';

const DashboardLayout = () => {
  return (
    <div style={styles.layout}>
      <DashboardSidebar />
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f9fafb',
    fontFamily: "'Outfit', sans-serif",
  },

  main: {
    flex: 1,
    marginLeft: '260px', // Width of sidebar
    minHeight: '100vh',
  },
};

export default DashboardLayout;
