import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Navigation, HeartHandshake, Leaf, LayoutDashboard, Globe, Sun, Moon } from 'lucide-react';
import ArenaControlDesk from './ArenaControlDesk';
import FanWayfinding from './pages/FanWayfinding';
import FanAccessibility from './pages/FanAccessibility';
import FanTransit from './pages/FanTransit';

function FanLayout() {
  const location = useLocation();
  const path = location.pathname;
  const [globalLanguage, setGlobalLanguage] = useState('English');
  const [theme, setTheme] = useState('light');

  React.useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [theme]);

  const linkStyle = (target) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: path === target ? 'var(--text-main)' : 'var(--text-muted)',
    textDecoration: 'none',
    fontWeight: path === target ? '700' : '500',
    padding: '1rem 1.2rem',
    borderRadius: '8px',
    background: path === target ? 'rgba(2, 83, 163, 0.1)' : 'transparent',
    border: path === target ? '1px solid rgba(2, 83, 163, 0.2)' : '1px solid transparent',
    transition: 'all 0.2s ease',
    marginBottom: '0.5rem',
    fontFamily: '"Outfit", sans-serif',
    fontSize: '1.05rem'
  });

  return (
    <div className="fan-layout-container" style={{ display: 'flex', height: '100dvh', width: '100%', overflow: 'hidden' }}>
      
      {/* SIDEBAR */}
      <aside className="fan-sidebar" style={{
        width: '280px',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border-color)',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50
      }}>
        <div className="sidebar-logo" style={{ marginBottom: '3rem', paddingLeft: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.6rem', fontWeight: '800', letterSpacing: '1px' }}>
            <span style={{ color: '#0253A3' }}>ArenaMind</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: '"JetBrains Mono", monospace', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Fan Experience
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Link to="/fan/wayfinding" style={linkStyle('/fan/wayfinding')}>
            <Navigation size={20} strokeWidth={2.5} style={{ color: path === '/fan/wayfinding' ? 'var(--accent-cyan)' : 'inherit' }} /> Wayfinding
          </Link>
          <Link to="/fan/accessibility" style={linkStyle('/fan/accessibility')}>
            <HeartHandshake size={20} strokeWidth={2.5} style={{ color: path === '/fan/accessibility' ? 'var(--accent-amber)' : 'inherit' }} /> Accessibility
          </Link>
          <Link to="/fan/transit" style={linkStyle('/fan/transit')}>
            <Leaf size={20} strokeWidth={2.5} style={{ color: path === '/fan/transit' ? 'var(--accent-green)' : 'inherit' }} /> Sustainable Transit
          </Link>
        </nav>

        <div className="sidebar-footer" style={{ marginTop: 'auto' }}>
          <Link to="/dashboard" style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            color: 'var(--text-muted)', textDecoration: 'none', fontWeight: '600',
            padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)',
            background: 'var(--bg-base)', transition: 'all 0.2s', fontFamily: '"Outfit", sans-serif'
          }}>
            <LayoutDashboard size={20} /> Staff Operations
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="fan-main-content" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        
        {/* GLOBAL HEADER CONTROLS (TOP RIGHT) */}
        <div className="global-header-controls" style={{ position: 'absolute', top: '2rem', right: '3rem', zIndex: 100, display: 'flex', alignItems: 'center', gap: '15px' }}>
          
          <button 
            className="theme-toggle-btn"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label="Toggle Theme"
            style={{ color: 'var(--text-main)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            {theme === 'light' ? <Moon size={20} className="theme-icon" /> : <Sun size={20} className="theme-icon" />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Globe size={18} style={{ color: 'var(--text-muted)' }} />
          <select 
            aria-label="Global Language"
            className="radio-input" 
            style={{ height: '36px', fontSize: '0.85rem', padding: '0 1rem', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} 
            value={globalLanguage} 
            onChange={e => setGlobalLanguage(e.target.value)}
          >
            <option value="English">English</option>
            <option value="Spanish">Español (Spanish)</option>
            <option value="French">Français (French)</option>
            <option value="German">Deutsch (German)</option>
            <option value="Portuguese">Português (Portuguese)</option>
            <option value="Japanese">日本語 (Japanese)</option>
            <option value="Arabic">العربية (Arabic)</option>
          </select>
          </div>
        </div>

        <Routes>
          <Route path="wayfinding" element={<FanWayfinding globalLanguage={globalLanguage} />} />
          <Route path="accessibility" element={<FanAccessibility globalLanguage={globalLanguage} />} />
          <Route path="transit" element={<FanTransit globalLanguage={globalLanguage} />} />
        </Routes>
      </main>

    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/fan/wayfinding" replace />} />
        
        {/* Fan Portal Routes wrapped in the Sidebar Layout */}
        <Route path="/fan/*" element={<FanLayout />} />

        {/* Staff Dashboard remains standalone full-screen */}
        <Route path="/dashboard" element={<ArenaControlDesk />} />
      </Routes>
    </BrowserRouter>
  );
}
