import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import ToastContainer from './components/ToastContainer';
import NavBar from './components/NavBar';

// Auth
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';

// Citizen
import CitizenHome from './pages/citizen/CitizenHome';
import CitizenSubmit from './pages/citizen/CitizenSubmit';
import CitizenSubmitSuccess from './pages/citizen/CitizenSubmitSuccess';
import CitizenHeatmap from './pages/citizen/CitizenHeatmap';
import CitizenTracking from './pages/citizen/CitizenTracking';
import CitizenTrackingDetail from './pages/citizen/CitizenTrackingDetail';
import CitizenProfile from './pages/citizen/CitizenProfile';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminIssues from './pages/admin/AdminIssues';
import AdminLiveMap from './pages/admin/AdminLiveMap';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminPredictions from './pages/admin/AdminPredictions';

// Department
import DeptDashboard from './pages/department/DeptDashboard';
import DeptIssues from './pages/department/DeptIssues';
import DeptLive from './pages/department/DeptLive';
import DeptAnalytics from './pages/department/DeptAnalytics';
import DeptPredictions from './pages/department/DeptPredictions';

const PAGE_TITLES = {
  '/citizen/home': 'Citizen Home',
  '/citizen/submit': 'Submit Complaint',
  '/citizen/submit/success': 'Submission Complete',
  '/citizen/heatmap': 'Heatmap',
  '/citizen/tracking': 'My Complaints',
  '/citizen/profile': 'Profile',
  '/admin/dashboard': 'Admin Dashboard',
  '/admin/issues': 'Issue Management',
  '/admin/live-map': 'Live Map',
  '/admin/analytics': 'Analytics',
  '/admin/predictions': 'Predictions',
  '/department/dashboard': 'Department Dashboard',
  '/department/issues': 'Issue List',
  '/department/live': 'Live Updates',
  '/department/analytics': 'Analytics',
  '/department/predictions': 'Hotspot Prediction',
};

function AppShell({ children }) {
  return (
    <div className="app-shell-v2">
      <NavBar />
      <main className="page-body-v2">{children}</main>
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { role } = useApp();
  if (!role) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { role } = useApp();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        role ? <Navigate to={`/${role}/${role === 'admin' ? 'dashboard' : role === 'department' ? 'dashboard' : 'home'}`} replace />
             : <LandingPage />
      } />

      {/* Citizen routes */}
      {[
        { path: '/citizen/home', El: CitizenHome },
        { path: '/citizen/submit', El: CitizenSubmit },
        { path: '/citizen/submit/success', El: CitizenSubmitSuccess },
        { path: '/citizen/heatmap', El: CitizenHeatmap },
        { path: '/citizen/tracking', El: CitizenTracking },
        { path: '/citizen/tracking/:id', El: CitizenTrackingDetail },
        { path: '/citizen/profile', El: CitizenProfile },
      ].map(({ path, El }) => (
        <Route key={path} path={path} element={
          <ProtectedRoute roles={['citizen']}>
            <AppShell title={PAGE_TITLES[path] || 'BharatCRS'}>
              <El />
            </AppShell>
          </ProtectedRoute>
        } />
      ))}

      {/* Admin routes */}
      {[
        { path: '/admin/dashboard', El: AdminDashboard },
        { path: '/admin/issues', El: AdminIssues },
        { path: '/admin/live-map', El: AdminLiveMap },
        { path: '/admin/analytics', El: AdminAnalytics },
        { path: '/admin/predictions', El: AdminPredictions },
      ].map(({ path, El }) => (
        <Route key={path} path={path} element={
          <ProtectedRoute roles={['admin']}>
            <AppShell title={PAGE_TITLES[path] || 'Admin'}>
              <El />
            </AppShell>
          </ProtectedRoute>
        } />
      ))}

      {/* Department routes */}
      {[
        { path: '/department/dashboard', El: DeptDashboard },
        { path: '/department/issues', El: DeptIssues },
        { path: '/department/live', El: DeptLive },
        { path: '/department/analytics', El: DeptAnalytics },
        { path: '/department/predictions', El: DeptPredictions },
      ].map(({ path, El }) => (
        <Route key={path} path={path} element={
          <ProtectedRoute roles={['department']}>
            <AppShell title={PAGE_TITLES[path] || 'Department'}>
              <El />
            </AppShell>
          </ProtectedRoute>
        } />
      ))}

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
        <ToastContainer />
      </AppProvider>
    </BrowserRouter>
  );
}
