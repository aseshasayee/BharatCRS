import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [role, setRole] = useState(null); // 'citizen' | 'admin' | 'department'
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const login = (selectedRole) => {
    const users = {
      citizen: { name: 'Priya Sharma', initials: 'PS', phone: '+91 98765 43210', role: 'citizen', memberSince: 'Jan 2023' },
      admin: { name: 'Admin User', initials: 'AU', email: 'admin@bharatcrs.gov.in', role: 'admin', memberSince: 'Jun 2022' },
      department: { name: 'Dept. Officer', initials: 'DO', email: 'pwd@bharatcrs.gov.in', role: 'department', dept: 'Public Works Dept.', memberSince: 'Mar 2023' },
    };
    setUser(users[selectedRole]);
    setRole(selectedRole);
  };

  const logout = () => { setRole(null); setUser(null); };

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <AppContext.Provider value={{
      role, user, login, logout,
      sidebarCollapsed, setSidebarCollapsed,
      mobileSidebarOpen, setMobileSidebarOpen,
      toasts, addToast, removeToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
