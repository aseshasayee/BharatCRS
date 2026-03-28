import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, FileText, BarChart2, Zap,
  Home, MapPin, PlusCircle, Bell, User, List,
  Radio, TrendingUp, ChevronLeft, ChevronRight,
  LogOut, Settings, AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_CONFIG = {
  citizen: [
    { label: 'Home', icon: Home, path: '/citizen/home' },
    { label: 'Submit Complaint', icon: PlusCircle, path: '/citizen/submit' },
    { label: 'Nearby Map', icon: MapPin, path: '/citizen/map' },
    { label: 'Heatmap', icon: Map, path: '/citizen/heatmap' },
    { label: 'My Complaints', icon: List, path: '/citizen/tracking' },
    { label: 'Profile', icon: User, path: '/citizen/profile' },
  ],
  admin: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Issue Management', icon: FileText, path: '/admin/issues' },
    { label: 'Live Map', icon: Map, path: '/admin/live-map' },
    { label: 'Analytics', icon: BarChart2, path: '/admin/analytics' },
    { label: 'Predictions', icon: TrendingUp, path: '/admin/predictions' },
  ],
  department: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/department/dashboard' },
    { label: 'Issue List', icon: FileText, path: '/department/issues' },
    { label: 'Live Updates', icon: Radio, path: '/department/live' },
    { label: 'Analytics', icon: BarChart2, path: '/department/analytics' },
    { label: 'Hotspot Prediction', icon: AlertTriangle, path: '/department/predictions' },
  ],
};

const ROLE_LABELS = { citizen: 'Citizen', admin: 'Administrator', department: 'Department Officer' };

export default function Sidebar() {
  const { role, user, sidebarCollapsed, setSidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const items = NAV_CONFIG[role] || [];
  const collapsed = sidebarCollapsed;

  const handleNav = (path) => {
    navigate(path);
    setMobileSidebarOpen(false);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99, backdropFilter: 'blur(2px)' }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <img
            src="/logo.svg"
            alt="BharatCRS logo"
            className="sidebar-logo-icon"
          />
          {!collapsed && (
            <div>
              <div className="sidebar-logo-text">BharatCRS</div>
              <div className="sidebar-logo-sub">Civic Reports</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav">
          {items.map(({ label, icon: Icon, path }) => {
            const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
            return (
              <button
                key={path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNav(path)}
                title={collapsed ? label : undefined}
              >
                <Icon className="nav-icon" size={18} />
                {!collapsed && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {!collapsed && user && (
            <div className="user-info">
              <div className="user-avatar">{user.initials}</div>
              <div>
                <div className="user-name">{user.name}</div>
                <div className="user-role">{ROLE_LABELS[role]}</div>
              </div>
            </div>
          )}
          <button className="nav-item" onClick={handleLogout} title="Logout">
            <LogOut size={18} className="nav-icon" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
