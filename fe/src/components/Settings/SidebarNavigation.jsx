import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Settings2, Grid3x3, Video, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SidebarNavigation = ({ activeTab, onTabChange }) => {
  const {t} = useTranslation();
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
    <Card className="w-80 h-fit">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">{t('settings.settings')}</h3>
          </div>
          
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <Button
                key={tab.id}
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start h-auto p-4 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => onTabChange(tab.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    <div className="text-left">
                      <div className={`font-medium ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {tab.label}
                      </div>
                      <div className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {tab.description}
                      </div>
                    </div>
                  </div>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-primary-foreground" />
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SidebarNavigation;
