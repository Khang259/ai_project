import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Workflows from './pages/Workflows';
import Templates from './pages/Templates';
import Team from './pages/Team';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
      <Route path="/analytics" element={<DashboardLayout><Analytics /></DashboardLayout>} />
      <Route path="/workflows" element={<DashboardLayout><Workflows /></DashboardLayout>} />
      <Route path="/templates" element={<DashboardLayout><Templates /></DashboardLayout>} />
      <Route path="/team" element={<DashboardLayout><Team /></DashboardLayout>} />
      <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
    </Routes>
  );
}

export default App;