import React from 'react';
import { Outlet } from 'react-router-dom';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar';

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
    marginLeft: '260px',
    flex: 1,
    minHeight: '100vh',
  },
};

export default DashboardLayout;