import { useState } from 'react';
import { Bell, Menu, X, Check, Terminal } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEPARTMENTS } from '../utils/helpers';

export default function TopBar({ title }) {
  const { role, user, setUser, setMobileSidebarOpen, mobileSidebarOpen, sidebarCollapsed, setSidebarCollapsed, showWorkingView, setShowWorkingView } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState(NOTIFICATIONS);

  const unread = notifs.filter(n => !n.read).length;

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));

  const typeColor = { info: '#1D4ED8', danger: '#DC2626', success: '#16A34A', warning: '#D97706' };

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <button
          style={{ background: 'none', border: 'none', color: 'var(--color-neutral-600)', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 4 }}
          onClick={() => {
            if (window.innerWidth <= 768) setMobileSidebarOpen(!mobileSidebarOpen);
            else setSidebarCollapsed(!sidebarCollapsed);
          }}
        >
          {mobileSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="top-bar-right" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '16px' }}>
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

        {/* Notification Bell */}
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          style={{
            position: 'relative', background: 'none', border: 'none',
            color: 'var(--color-neutral-600)', padding: '8px',
            borderRadius: 'var(--radius-md)', cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-neutral-100)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Bell size={20} />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              background: 'var(--color-danger)', color: 'white',
              borderRadius: '50%', width: 16, height: 16,
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {unread}
            </span>
          )}
        </button>

        {/* Notification Panel */}
        {notifOpen && (
          <div className="notif-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-neutral-200)' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
              <button
                onClick={markAllRead}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Check size={12} /> Mark all read
              </button>
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {notifs.map(n => (
                <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? 'transparent' : typeColor[n.type], flexShrink: 0, marginTop: 6 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--color-neutral-900)' }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginTop: 2 }}>{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
