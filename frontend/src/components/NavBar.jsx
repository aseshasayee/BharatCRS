import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, FileText, BarChart2,
  Home, MapPin, List, Radio, TrendingUp,
  LogOut, Bell, Check, User, ChevronDown, Zap, AlertTriangle, Terminal
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_CONFIG = {
  citizen: [
    { label: 'Home', icon: Home, path: '/citizen/home' },
    { label: 'Submit', icon: Zap, path: '/citizen/submit' },
    { label: 'Heatmap', icon: Map, path: '/citizen/heatmap' },
    { label: 'My Complaints', icon: List, path: '/citizen/tracking' },
    { label: 'Profile', icon: User, path: '/citizen/profile' },
  ],
  admin: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Issues', icon: FileText, path: '/admin/issues' },
    { label: 'Live Map', icon: Map, path: '/admin/live-map' },
    { label: 'Analytics', icon: BarChart2, path: '/admin/analytics' },
    { label: 'Predictions', icon: TrendingUp, path: '/admin/predictions' },
  ],
  department: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/department/dashboard' },
    { label: 'Issues', icon: FileText, path: '/department/issues' },
    { label: 'Live', icon: Radio, path: '/department/live' },
    { label: 'Analytics', icon: BarChart2, path: '/department/analytics' },
    { label: 'Predictions', icon: AlertTriangle, path: '/department/predictions' },
  ],
};

const ROLE_LABELS = { citizen: 'Citizen', admin: 'Administrator', department: 'Dept. Officer' };
const ROLE_COLORS = { citizen: '#10B981', admin: '#3B82F6', department: '#8B5CF6' };

export default function NavBar() {
  const { role, user, logout, showWorkingView, setShowWorkingView } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  const items = NAV_CONFIG[role] || [];
  const unread = notifs.filter(n => !n.read).length;
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const typeColor = { info: '#3B82F6', danger: '#EF4444', success: '#10B981', warning: '#F59E0B' };

  const roleColor = ROLE_COLORS[role] || '#3B82F6';

  return (
    <header className="navbar">
      {/* Brand */}
      <div className="navbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <img src="/logo.svg" alt="BharatCRS" className="navbar-logo" />
        <span className="navbar-brand-text">BharatCRS</span>
        <span className="navbar-brand-pill" style={{ background: roleColor + '22', color: roleColor }}>
          {ROLE_LABELS[role] || 'User'}
        </span>
      </div>

      {/* Nav Links */}
      <nav className="navbar-nav">
        {items.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
          return (
            <button
              key={path}
              className={`navbar-link ${isActive ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={15} />
              <span>{label}</span>
              {isActive && <span className="navbar-link-dot" />}
            </button>
          );
        })}
      </nav>

      {/* Right Actions */}
      <div className="navbar-actions">
        {/* Transparency Mode Toggle */}
        <button 
          onClick={() => setShowWorkingView(!showWorkingView)}
          title="Toggle UI Transparency / Agent Working View"
          style={{ 
            background: showWorkingView ? 'var(--color-primary-light)' : 'transparent',
            color: showWorkingView ? 'var(--color-primary)' : 'var(--color-neutral-600)',
            border: `1px solid ${showWorkingView ? 'var(--color-primary)' : 'var(--color-neutral-300)'}`,
            padding: '4px 10px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <Terminal size={14} />
          {showWorkingView ? 'Agent View: ON' : 'Agent View: OFF'}
        </button>

        {/* Live Indicator */}
        <div className="navbar-live-badge">
          <span className="navbar-live-dot" />
          Live
        </div>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="navbar-icon-btn"
            onClick={() => { setNotifOpen(o => !o); setUserOpen(false); }}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="navbar-badge">{unread}</span>
            )}
          </button>

          {notifOpen && (
            <div className="navbar-dropdown notif-dropdown">
              <div className="navbar-dropdown-header">
                <span>Notifications</span>
                <button className="navbar-dropdown-action" onClick={markAllRead}>
                  <Check size={11} /> Mark all read
                </button>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notifs.map(n => (
                  <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: n.read ? 'transparent' : typeColor[n.type], flexShrink: 0, marginTop: 5 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--color-neutral-900)', fontWeight: n.read ? 400 : 600 }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-neutral-400)', marginTop: 2 }}>{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div ref={userRef} style={{ position: 'relative' }}>
          <button
            className="navbar-user-btn"
            onClick={() => { setUserOpen(o => !o); setNotifOpen(false); }}
          >
            <div className="navbar-avatar" style={{ background: roleColor }}>
              {user?.initials || (user?.name?.[0] || '?')}
            </div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">{user?.name || 'User'}</span>
              <span className="navbar-user-role">{ROLE_LABELS[role]}</span>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--color-neutral-400)', transition: 'transform 0.2s', transform: userOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          {userOpen && (
            <div className="navbar-dropdown user-dropdown">
              <div className="navbar-dropdown-profile">
                <div className="navbar-avatar-lg" style={{ background: roleColor }}>{user?.initials || '?'}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.name || 'User'}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>{ROLE_LABELS[role]}</div>
                </div>
              </div>
              <div className="navbar-dropdown-divider" />
              <button className="navbar-dropdown-item danger" onClick={handleLogout}>
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
