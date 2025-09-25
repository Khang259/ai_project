import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import TaskManagement from './pages/TaskManagement';
import Notification from './pages/Notification';
import Users from './pages/Users';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
      <Route path="/analytics" element={<DashboardLayout><Analytics /></DashboardLayout>} />
      <Route path="/task" element={<DashboardLayout><TaskManagement /></DashboardLayout>} />
      <Route path="/notification" element={<DashboardLayout><Notification /></DashboardLayout>} />
      <Route path="/users" element={<DashboardLayout><Users /></DashboardLayout>} />
      <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
    </Routes>
  );
}

export default App;