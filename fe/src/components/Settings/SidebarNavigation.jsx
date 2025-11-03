// SidebarNavigation.jsx
import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Settings2, Grid3x3, Video, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SidebarNavigation = ({ activeTab, onTabChange, isCollapsed, onToggleCollapse }) => {
  const { t } = useTranslation();

  const tabs = [
    {
      id: 'button',
      label: t('settings.buttonSettings'),
      icon: Grid3x3,
      description: t('settings.buttonSettingsDescription')
    },
    {
      id: 'camera',
      label: t('settings.cameraSettings'),
      icon: Video,
      description: t('settings.cameraSettingsDescription')
    }
  ];

  return (
    <Card 
      className={`
        glass border-0 shadow-lg transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-80'}
      `}
    >
      <CardContent className="">
      {isCollapsed ? (
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 text-white hover:bg-white/10"
            title="Mở rộng"
          >
            <ChevronRight className="h-20 w-20" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header + Toggle Button */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-4`}>
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-white" />
                <h3 className="font-semibold text-lg">{t('settings.settings')}</h3>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8 text-white hover:bg-white/10"
              title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Tabs */}
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Button
                key={tab.id}
                variant={isActive ? "default" : "ghost"}
                className={`
                  w-full h-auto p-4 transition-all
                  ${isActive 
                    ? 'bg-blue-500 text-white shadow-lg hover:bg-blue-500' 
                    : 'hover:text-blue-500 hover:bg-white/10' 
                  }
                  ${isCollapsed ? 'justify-center px-2' : 'justify-start'}
                `}
                onClick={() => onTabChange(tab.id)}
                title={isCollapsed ? tab.label : ''}
              >
                <div className={`flex items-center ${isCollapsed ? '' : 'justify-between'} w-full`}>
                  <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
                    <Icon className={`h-10 w- ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    {!isCollapsed && (
                      <div className="text-left">
                        <div className={`font-medium ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                          {tab.label}
                        </div>
                        <div className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {tab.description}
                        </div>
                      </div>
                    )}
                  </div>
                  {!isCollapsed && isActive && (
                    <ChevronRight className="h-4 w-4 text-primary-foreground" />
                  )}
                </div>
              </Button>
            );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SidebarNavigation;