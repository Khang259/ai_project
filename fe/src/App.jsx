import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import TaskManagement from './pages/TaskManagement';
import Notification from './pages/Notification';
import Users from './pages/Users';
import Settings from './pages/Settings';
import LoginPage from './pages/Login';
import PrivateRoute from './components/PrivateRoute'; // thêm

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<LoginPage />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Analytics />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/task"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <TaskManagement />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/notification"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Notification />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/users"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Users />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;
