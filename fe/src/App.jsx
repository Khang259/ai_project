import { useEffect, useState } from "react";
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/DashBoard';
import Analytics from './pages/Analytics';
import TaskManagement from './pages/TaskManagement';
import Notification from './pages/Notification';
import Users from './pages/Users';
import Settings from './pages/Settings';
import LoginPage from './pages/Login';
import Maintain from './pages/Maintain';
import MonitorPackaged from './pages/MonitorPackaged';
import MobileGridDisplay from './pages/MobileGridDisplay';
import Area from './pages/Area';
import PrivateRoute from './components/PrivateRoute'; 
import { AreaProvider } from './contexts/AreaContext';
import { LanguageProvider } from './contexts/LanguageContext';
import './i18n';

function App() {
  const [showVideo, setShowVideo] = useState(false);
  useEffect(() => {
    // Khi React mount xong, bật cờ hiển thị video
    setShowVideo(true);
  }, []);
  return (
    <LanguageProvider>
      <AreaProvider>
      {/* Background video */}
      {/* {showVideo && (
          <video
            id="background-video"
            autoPlay
            muted
            loop
            playsInline
            className="fixed top-0 left-0 w-full h-full object-cover -z-10 opacity-0 transition-opacity duration-700"
            onCanPlay={(e) => (e.target.style.opacity = 1)} // fade-in khi sẵn sàng
          >
            <source src="/src/assets/vid_bg.mp4" type="video/mp4" />
          </video>
        )} */}
        <div className="fixed top-0 left-0 w-full h-full bg-black -z-10"></div>
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
            path="/maintain"
            element={
              <PrivateRoute requiredRole="admin">
                <DashboardLayout>
                  <Maintain />
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
            path="/area"
            element={
              <PrivateRoute requiredRole="admin">
                <DashboardLayout>
                  <Area />
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
          <Route
            path="/monitor-packaged"
            element={
              <PrivateRoute requiredRole="admin">
                <MonitorPackaged />
              </PrivateRoute>
            }
          />
        </Routes>
      </AreaProvider>
    </LanguageProvider>
  );
}

export default App;
