import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import SearchPage from './pages/SearchPage';
import OutreachPage from './pages/OutreachPage';
import HistoryPage from './pages/HistoryPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        {/* Landing page has NO navbar */}
        <Routes>
          {/* PUBLIC LANDING PAGE (no navbar) */}
          <Route path="/" element={<LandingPage />} />
          
          {/* APP PAGES (with navbar) */}
          <Route path="/app/*" element={
            <>
              <Navbar />
              <Routes>
                <Route path="search" element={<SearchPage />} />
                <Route path="outreach" element={<OutreachPage />} />
                <Route path="history" element={<HistoryPage />} />
              </Routes>
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
