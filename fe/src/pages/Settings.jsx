// Settings.jsx
import React, { useState } from 'react';
import SidebarNavigation from '../components/Settings/SidebarNavigation';
import ButtonSettings from '../components/Settings/ButtonSettings';
import CameraSettings from '../components/Settings/CameraSettings';
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
      default:
        return <ButtonSettings />;
    }
  };

  return (
    <main className="min-h-screen w-screen">
      <div className="container mx-auto p-6 max-w-screen text-white">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Settings2 className="h-8 w-8 text-white" />
            {t('settings.systemSettings')}
          </h1>
          <p className="text-white text-lg">
            {t('settings.systemSettingsDescription')}
          </p>
        </div>

        {/* Main Content with Collapsible Sidebar */}
        <div className="flex text-white gap-6">
          {/* Sidebar */}
          <div className={isSidebarCollapsed ? '' : 'flex-shrink-0'}>
            <SidebarNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
            />
          </div>

          {/* Content Area - Full width khi sidebar thu gọn */}
          <div 
            className={`
              flex-1 transition-all duration-300
              ${isSidebarCollapsed ? 'w-full' : ''}
            `}
          >
            <div className={isSidebarCollapsed ? 'mx-4' : ''}>
              {renderActiveTab()}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Settings;