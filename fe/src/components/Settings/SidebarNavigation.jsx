// SidebarNavigation.jsx
import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Settings2, Grid3x3, Video, ChevronRight, ChevronLeft, Route, Monitor } from 'lucide-react';
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
    },
    {
      id: 'route',
      label: t('settings.routeSettings'),
      icon: Route,
      description: t('settings.routeSettingsDescription')
    },
    {
      id: 'monitor',
      label: t('settings.monitorSettings'),
      icon: Monitor,
      description: t('settings.monitorSettingsDescription')
    }
  ];

  return (
    <Card
      className={`
        glass border-0 shadow-lg transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-72 lg:w-80'}
      `}
    >
      <CardContent className="p-2 lg:p-3">
      {isCollapsed ? (
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-9 w-9 lg:h-10 lg:w-10 text-white hover:bg-white/10"
            title="Mở rộng"
          >
            <ChevronRight className="h-6 w-6 lg:h-7 lg:w-7" />
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-2 lg:mb-3`}>
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                <h3 className="font-semibold text-base lg:text-lg">{t('settings.settings')}</h3>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-9 w-9 lg:h-10 lg:w-10 text-white hover:bg-white/10"
              title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
            >
              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
          </div>

          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Button
                key={tab.id}
                variant={isActive ? "default" : "ghost"}
                className={`
                  w-full h-auto py-2.5 px-2 lg:py-3 lg:px-3 transition-all text-base lg:text-lg
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
                    <Icon className={`h-9 w-9 lg:h-10 lg:w-10 flex-shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    {!isCollapsed && (
                      <div className="text-left min-w-0">
                        <div className={`font-medium ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                          {tab.label}
                        </div>
                        <div className={`text-sm ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {tab.description}
                        </div>
                      </div>
                    )}
                  </div>
                  {!isCollapsed && isActive && (
                    <ChevronRight className="h-5 w-5 flex-shrink-0 text-primary-foreground" />
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