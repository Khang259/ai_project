import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Home, Workflow, BarChart3, Settings, Users, ChevronDown, Map, Wrench } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import '../styles/glass.css';
import { useAuth } from "@/hooks/useAuth";
import { useArea } from "@/contexts/AreaContext";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const navigation = [
  { nameKey: "navigation.dashboard", href: "/dashboard", icon: Home },
  { nameKey: "navigation.taskManagement", href: "/task", icon: Workflow },
  { nameKey: "navigation.analytics", href: "/analytics", icon: BarChart3 },
  { nameKey: "navigation.notification", href: "/notification", icon: Bell },
  { nameKey: "navigation.userManagement", href: "/users", icon: Users },
  { nameKey: "navigation.areaManagement", href: "/area", icon: Map },
  { nameKey: "navigation.settings", href: "/settings", icon: Settings },
  { nameKey: "navigation.maintain", href: "/maintain", icon: Wrench },
];

export default function DashboardLayout({ children }) {  // Bỏ interface, dùng { children }
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const { areaData, currAreaName, setCurrAreaName, setCurrAreaId, loading: areaLoading, error: areaError } = useArea();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleAreaSelect = (areaName) => {
    const selected = areaData.find((a) => a.area_name === areaName);
    if (selected) {
      setCurrAreaName(selected.area_name);
      setCurrAreaId(selected.area_id);
      console.log('[DashboardLayout] Area selected:', selected);
    }
  };

  // Lọc menu dựa trên role
  const filteredNavigation = navigation.filter(item => {
    // Nếu user có role admin hoặc superuser, hiển thị tất cả menu
    if (auth.user?.roles?.includes('admin') || auth.user?.roles?.includes('superuser')) {
      return true;
    }
    // Nếu chỉ có role user, ẩn một số menu nhạy cảm
    if (auth.user?.roles?.includes('user') && !auth.user?.roles?.includes('admin')) {
      return !['navigation.userManagement', 'navigation.settings'].includes(item.nameKey);
    }
    return true;
  });

  return (
    <div className="min-h-screen pt-3 ">
      <div className="glass"> 
        <header className="h-16 px-6 flex items-center justify-between " >
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <img src="/src/assets/logo_cty.png" alt="Company Logo" className="max-w-55" />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2" disabled={areaLoading}>
                    <span className="font-medium">
                      {areaLoading ? t('area.loading') : areaError ? t('area.errorLoading') : currAreaName || t('area.notSelected')}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>{t('area.selectArea')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {areaLoading ? (
                    <DropdownMenuItem disabled>
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        {t('area.loadingAreas')}
                      </div>
                    </DropdownMenuItem>
                  ) : areaError ? (
                    <DropdownMenuItem disabled className="text-red-500">
                      ❌ {areaError}
                    </DropdownMenuItem>
                  ) : areaData.length === 0 ? (
                    <DropdownMenuItem disabled>
                      {t('area.noAreas')}
                    </DropdownMenuItem>
                  ) : (
                    areaData.map((area) => (
                      <DropdownMenuItem
                        key={area.area_id}
                        onClick={() => handleAreaSelect(area.area_name)}
                        className={currAreaName === area.area_name ? "bg-accent" : ""}
                      >
                        {area.area_name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Navigation trong header */}
            <nav className="flex items-center space-x-1 px-8">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.nameKey}
                    to={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-roboto text-white transition-colors ${
                      isActive
                        ? "bg-[rgb(34,189,189)/.1] text-[rgb(34,189,189)] hover:bg-[rgb(34,189,189)/.2]"
                        : "text-gray-600 hover:shadow-[0_4px_24px_0_rgb(34,189,189,0.5)] "
                    }`}
                  >
                    <item.icon className="w-7 h-7 mr-2" />
                    {t(item.nameKey)}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                    <AvatarFallback>Info</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{auth.user?.username || t('user.user')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>{t('user.logout')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      </div>
      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>

    </div>
  );
}