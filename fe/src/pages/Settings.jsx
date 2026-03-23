// Settings.jsx
import React, { useState } from 'react';
import SidebarNavigation from '../components/Settings/SidebarNavigation';
import ButtonSettings from '../components/Settings/ButtonSettings';
import CameraSettings from '../components/Settings/CameraSettings';
import MonitorSettings from '../components/Settings/MonitorSettings';
import RouteSettings from '../components/Settings/RouteSettings/RouteTable';
import { Settings2 } from 'lucide-react';
import { useArea } from '../contexts/AreaContext';
import { useTranslation } from "react-i18next";

const Settings = () => {
  const [activeTab, setActiveTab] = useState('button');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { currAreaName, currAreaId } = useArea();
  const { t } = useTranslation();

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'button':
        return <ButtonSettings />;
      case 'camera':
        return <CameraSettings />;
      case 'monitor':
        return <MonitorSettings />;
      case 'route':
        return <RouteSettings />;
      default:
        return <ButtonSettings />;
    }
  };

  return (
    <main className="min-h-screen w-full min-w-0">
      <div className="container mx-auto p-6 lg:p-8 max-w-full text-white min-w-0">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Settings2 className="h-7 w-7 lg:h-8 lg:w-8 text-white" />
            {t('settings.systemSettings')}
          </h1>
          <p className="text-white text-base lg:text-lg">
            {t('settings.systemSettingsDescription')}
          </p>
        </div>

        <div className="flex text-white gap-4 lg:gap-6 min-w-0">
          <div className="flex-shrink-0">
            <SidebarNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
            />
          </div>

          <div className="flex-1 min-w-0 overflow-hidden transition-all duration-300">
            <div className={isSidebarCollapsed ? 'mx-2 lg:mx-4' : ''}>
              {renderActiveTab()}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Settings;