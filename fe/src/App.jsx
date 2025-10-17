import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/DashBoard';
import Analytics from './pages/Analytics';
import TaskManagement from './pages/TaskManagement';
import Notification from './pages/Notification';
import Users from './pages/Users';
import Settings from './pages/Settings';
import LoginPage from './pages/Login';
import MobileGridDisplay from './pages/MobileGridDisplay';
import PrivateRoute from './components/PrivateRoute';
import { AreaProvider } from './contexts/AreaContext';

function App() {
  return (
    <AreaProvider>
      <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<LoginPage />} />

      {/* User routes - Mobile Grid Display */}
      <Route
        path="/mobile-grid-display"
        element={
          <PrivateRoute>
            <MobileGridDisplay />
          </PrivateRoute>
        }
      />

      {/* Admin routes - Dashboard Layout */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute requiredRole="admin">
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <PrivateRoute requiredRole="admin">
            <DashboardLayout>
              <Analytics />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/task"
        element={
          <PrivateRoute requiredRole="admin">
            <DashboardLayout>
              <TaskManagement />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/notification"
        element={
          <PrivateRoute requiredRole="admin">
            <DashboardLayout>
              <Notification />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/users"
        element={
          <PrivateRoute requiredRole="admin">
            <DashboardLayout>
              <Users />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute requiredRole="admin">
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      </Routes>
    </AreaProvider>
  );
}

export default App;
