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
    <div className="min-h-screen pt-3">
      <div className="mx-4 mb-4">
        <header className="header-glassmorphism h-20 px-8 flex items-center justify-between rounded-2xl">
          {/* Left Section - Logo & Area Selector */}
          <div className="flex items-center gap-6">
            {/* Logo - Minimal Design */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src="/src/assets/logo_cty.png" 
                  alt="Company Logo" 
                  className="h-12 w-auto object-contain filter drop-shadow-lg" 
                />
              </div>
            </div>

            {/* Area Selector - Neumorphism Style */}
            <div className="hidden md:flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="header-button-neumorphism flex items-center gap-2 border-none text-white h-10 px-4 rounded-xl font-medium bg-transparent" 
                    disabled={areaLoading}
                  >
                    <span className="text-sm">
                      {areaLoading ? t('area.loading') : areaError ? t('area.errorLoading') : currAreaName || t('area.notSelected')}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 backdrop-blur-xl bg-white/90 border border-white/20 shadow-xl">
                  <DropdownMenuLabel className="text-gray-700">{t('area.selectArea')}</DropdownMenuLabel>
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
            
            {/* Navigation - Minimal & Clean */}
            <nav className="hidden lg:flex items-center gap-2 ml-4">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.nameKey}
                    to={item.href}
                    className={`header-nav-item flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? "active text-[rgb(34,189,189)]"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-[rgb(34,189,189)]' : ''}`} />
                    <span className="hidden xl:inline">{t(item.nameKey)}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Section - Language & User */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="header-button-neumorphism border-none rounded-full w-10 h-10 bg-transparent hover:bg-transparent"
                >
                  <Avatar className="w-10 h-10 border-2 border-white/30 shadow-lg">
                    <AvatarImage src="/placeholder.svg?height=40&width=40" />
                    <AvatarFallback className="bg-gradient-to-br from-[rgb(34,189,189)] to-[rgb(20,140,140)] text-white font-semibold">
                      {auth.user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 backdrop-blur-xl bg-white/90 border border-white/20 shadow-xl">
                <DropdownMenuLabel className="text-gray-700">
                  <div className="flex flex-col">
                    <span className="font-semibold">{auth.user?.username || t('user.user')}</span>
                    <span className="text-xs text-gray-500 font-normal mt-0.5">
                      {auth.user?.roles?.join(', ') || ''}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-700 focus:bg-red-50"
                >
                  {t('user.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      </div>
      {/* Main Content */}
      <main className="min-h-[calc(100vh-5rem)] px-4">{children}</main>
    </div>
  );
}