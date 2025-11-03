import React, { useState } from 'react';
import SidebarNavigation from '../components/Settings/SidebarNavigation';
import ButtonSettings from '../components/Settings/ButtonSettings';
import CameraSettings from '../components/Settings/CameraSettings';
import MonitorSettings from '../components/Settings/MonitorSettings';
import { Settings2 } from 'lucide-react';
import { useArea } from '../contexts/AreaContext';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('button');
  const { currAreaName, currAreaId } = useArea();

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'button':
        return <ButtonSettings />;
      case 'camera':
        return <CameraSettings />;
      case 'monitor':
        return <MonitorSettings />;
      default:
        return <ButtonSettings />;
    }
  };

  return (
    <main className="min-h-screen w-screen bg-background">
      <div className="container mx-auto p-6 max-w-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Settings2 className="h-8 w-8 text-primary" />
            Cài Đặt Hệ Thống
          </h1>
          <p className="text-muted-foreground text-lg">
            Quản lý cấu hình lưới hiển thị và địa chỉ IP camera
          </p>
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="flex-shrink-1">
            <SidebarNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {renderActiveTab()}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Settings;