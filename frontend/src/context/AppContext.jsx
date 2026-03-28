import { createContext, useContext, useState } from 'react';
import { authService } from '../services/authService';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [role, setRole] = useState(null); // 'citizen' | 'admin' | 'department'
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const login = async (username, password) => {
    try {
      const data = await authService.login(username, password);
      setUser({ name: data.username, department: data.department_name, initials: data.username.substring(0, 2).toUpperCase() });
      setRole(data.role);
      return data;
    } catch (error) {
      throw error;
    }
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
