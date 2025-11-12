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
    <div className="bg-gray-900 ">
      <div className="relative w-full">
        {/* SVG frame bao quanh header */}
        <svg
          className="pointer-events-none absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 1. Đường nền (toàn bộ, màu gốc, mờ) */}
          <path
            d="M 0 100 L 14 100 L 16.5 100 L 20 70 L 23 70 L 80 70 L 83 40 L 83 0"
            stroke="rgb(34,189,189)"
            strokeWidth="4"
            fill="none"
            vectorEffect="non-scaling-stroke"
            filter="url(#glowBlur)"
          />

          <path
            d="M 0 100 L 14 100"
            stroke="rgb(34,189,189)"
            strokeWidth="6"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />


          {/* 2. Gradient 1: Xanh Cyan → Lục Neon (16.5,100 → 20,70) */}
          <defs>
            {/* Blur filter for glow effect */}
            <filter id="glowBlur" x="-100%" y="-100%" width="700%" height="700%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="cyanToGreen" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#9B59B6" />
              <stop offset="100%" stopColor="#A930FF" />
            </linearGradient>
          </defs>

          <path
            d="M 14 100 L 16.5 100"
            stroke="url(#cyanToGreen)"
            strokeWidth="6"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />

          <path
            d="M 14 100 L 16.5 100 L 20 70 L 23 70 "
            stroke="url(#cyanToGreen)"
            strokeWidth="4"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <header className="relative flex items-center justify-between rounded-2xl px-4 py-3">
          {/* Left Section - Logo & Area Selector */}
          <div className="relative flex items-center z-1" 
            // style={{ 
            //   borderBottom: '1px solid rgb(34,189,189)' 
            //   }}
          >
            {/* Logo - Minimal Design */}
            <div className="w-1/5 flex items-center gap-3">
              <div className="">
                <img 
                  src="/src/assets/logo_cty.png" 
                  alt="Company Logo" 
                  className="h-14 object-contain filter drop-shadow-lg" 
                />
              </div>
            </div>

            {/* Navigation*/}
            <div className="row-2">
              <div className="relative">
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

                {/* Trapezoid: width = 100% navigation, height = phần còn lại */}
                <div className="relative bottom-0 left-0 w-full h-10 overflow-visible pointer-events-none">
                  {/* <svg
                    width="100%"
                    height="30"
                    viewBox="0 0 100 30"
                    preserveAspectRatio="none"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                  >
                    <path
                      d="M 0 30 L 10 0 L 100 0"
                      stroke="rgb(34,189,189)"
                      strokeWidth="1"
                      fill="none"
                    />

                    <path
                      d="M 100 0 L 100 30 L 0 30 Z"
                      stroke="none"
                      fill="none"
                    />
                  </svg> */}
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Language & User */}
          <div className="flex items-center gap-3">
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
      <main className="px-4">{children}</main>
    </div>
  );
}