import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Home, Workflow, BarChart3, Settings, Users, ChevronDown, Map, MapPin, Wrench } from "lucide-react";
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
  { nameKey: "navigation.warehouseMap", href: "/warehouse-map", icon: MapPin },
  { nameKey: "navigation.taskManagement", href: "/task-management", icon: Workflow },
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
  const { areaData, currAreaName, currAreaId, setCurrAreaName, setCurrAreaId, currDashboardGroupId, setCurrDashboardGroupId, loading: areaLoading, error: areaError } = useArea();
  const { t } = useTranslation();

  // Kiểm tra quyền admin/superuser để hiển thị Area + Route selector (roles có thể 'admin', 'Admin', 'superuser')
  const isAdmin = Array.isArray(auth.user?.roles) && auth.user.roles.some((r) => {
    const role = String(r).toLowerCase();
    return role === 'admin' || role === 'superuser';
  });

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

  const isDashboardPage = pathname === '/dashboard';
  const showRouteSelect = isDashboardPage && (Number(currAreaId) === 1);
  const dashboardRouteLabel = currDashboardGroupId == null ? t('route.all') : (currDashboardGroupId === 2 ? 'MS' : currDashboardGroupId === 4 ? 'PA' : String(currDashboardGroupId));

  // Lọc menu dựa trên role
  const filteredNavigation = navigation.filter(item => {
    // Admin/Superuser: Hiển thị tất cả menu
    if (auth.user?.roles?.includes('admin') || auth.user?.roles?.includes('superuser')) {
      return true;
    }

    // Operator: Ẩn Area Management và Settings
    if (auth.user?.roles?.includes('operator')) {
      return !['navigation.areaManagement'].includes(item.nameKey);
    }
    return true;
  });

  return (
    <div className="w-full max-w-[100vw] overflow-x-hidden min-w-0">
      <div className="relative w-full h-full min-w-0">
        {/* Lớp SVG - fullhd: dịch sang phải 1 chút */}
        <div className="pointer-events-none absolute inset-0 laptop13:left-5 laptop13:right-0 laptop13:top-0 laptop13:bottom-0 fullhd:left-5 fullhd:right-0 fullhd:top-0 fullhd:bottom-0 tv:left-5 tv:right-0 tv:top-0 tv:bottom-0 w-full min-w-full h-full" aria-hidden="true">
          <svg
            className="w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
          {/* 1. Đường nền (vạch xanh) - dịch lên trên và sang trái so với header */}
          <path
            d="M 0 100 L 12 100 L 14 100 L 17 65 L 20 65 L 82 65 L 85 35 L 85 0"
            stroke="rgb(34,189,189)"
            strokeWidth="4"
            fill="none"
            vectorEffect="non-scaling-stroke"
            filter="url(#glowBlur)"
          />

          <path
            d="M 0 100 L 12 100"
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
            d="M 12 100 L 14 100"
            stroke="url(#cyanToGreen)"
            strokeWidth="6"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />

          <path
            d="M 12 100 L 14 100 L 17 65 L 20 65 L 70"
            stroke="url(#cyanToGreen)"
            strokeWidth="4"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
          </svg>
        </div>
        <header className="relative grid grid-cols-[auto_1fr_auto] items-center gap-0 rounded-2xl px-4 py-3 lg:px-6 lg:py-4 xl:px-8 xl:py-4 laptop13:px-8 laptop13:py-4 fullhd:px-8 fullhd:py-4 tv:px-8 tv:py-4 min-w-0 w-full">
          {/* Cột 1: Logo - chỉnh margin/dịch logo không ảnh hưởng menu */}
          <div className="relative flex items-center justify-start z-1 min-w-0">
            <div className="p-0 flex items-center gap-0 laptop13:-ml-2 laptop13:mt-12 fullhd:-ml-2 fullhd:mt-12 tv:-ml-2 tv:mt-12">
              <div className="flex-shrink-0 p-0">
                <img
                  src="/src/assets/logo_cty.png"
                  alt="Company Logo"
                  className="h-6 lg:h-7 xl:h-8 laptop13:h-11 fullhd:h-11 tv:h-11 object-contain filter drop-shadow-lg block"
                />
              </div>
            </div>
          </div>

          {/* Cột 2: Navigation - khối riêng, fullhd dịch trái menu không đổi khi chỉnh logo */}
          <div className="relative flex items-center min-w-0 z-1 laptop13:-ml-12 fullhd:-ml-12 tv:-ml-12">
            <div className="row-2 w-full">
              <div className="relative lg:ml-8 xl:ml-10 laptop13:ml-6 fullhd:ml-6 tv:ml-6">
                <nav className="hidden lg:flex items-center gap-1 lg:gap-2 laptop13:gap-0 fullhd:gap-0 tv:gap-0 ml-0 lg:ml-0.5">
                  {filteredNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.nameKey}
                        to={item.href}
                        className={`header-nav-item flex items-center gap-1.5 lg:gap-2 laptop13:gap-2.5 fullhd:gap-2.5 tv:gap-2.5 px-2.5 py-2 lg:px-3 lg:py-2.5 xl:px-3.5 xl:py-2.5 laptop13:px-5 laptop13:py-3.5 fullhd:px-5 fullhd:py-3.5 tv:px-5 tv:py-3.5 rounded-lg text-xs lg:text-sm font-medium transition-all duration-300 ${isActive
                            ? "active text-[rgb(34,189,189)]"
                            : "text-gray-300 hover:text-white"
                          }`}
                      >
                        <item.icon className={`w-4 h-4 lg:w-4 lg:h-4 xl:w-4 xl:h-4 laptop13:w-[18px] laptop13:h-[18px] fullhd:w-[18px] fullhd:h-[18px] tv:w-[18px] tv:h-[18px] flex-shrink-0 ${isActive ? 'text-[rgb(34,189,189)]' : ''}`} />
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

          {/* Right Section - Language & User (nhỏ gọn) */}
          <div className="flex items-center gap-2 lg:gap-4">
            {isAdmin && (
              <div className="flex flex-col gap-1 items-stretch min-w-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="header-button-neumorphism flex items-center gap-1 lg:gap-1.5 border-none text-white h-7 lg:h-8 laptop13:h-8 fullhd:h-8 tv:h-8 px-3 lg:px-4 rounded-lg text-xs font-medium bg-transparent"
                      disabled={areaLoading}
                    >
                      <span className="text-sm">
                        {areaLoading ? t('area.loading') : areaError ? t('area.errorLoading') : currAreaName || t('area.notSelected')}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
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
                {showRouteSelect && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="header-button-neumorphism flex items-center gap-1 lg:gap-1.5 border-none text-white h-7 lg:h-8 laptop13:h-8 fullhd:h-8 tv:h-8 px-3 lg:px-4 rounded-lg text-xs font-medium bg-transparent"
                      >
                        <span className="text-sm">{dashboardRouteLabel}</span>
                        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 backdrop-blur-xl bg-white/90 border border-white/20 shadow-xl">
                      <DropdownMenuLabel className="text-gray-700">{t('route.labelArea1')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setCurrDashboardGroupId(null)} className={currDashboardGroupId == null ? 'bg-accent' : ''}>
                        {t('route.all')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setCurrDashboardGroupId(2)} className={currDashboardGroupId === 2 ? 'bg-accent' : ''}>
                        MS
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setCurrDashboardGroupId(4)} className={currDashboardGroupId === 4 ? 'bg-accent' : ''}>
                        PA
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="header-button-neumorphism border-none rounded-full w-8 h-8 lg:w-9 lg:h-9 laptop13:w-9 laptop13:h-9 fullhd:w-9 fullhd:h-9 tv:w-9 tv:h-9 bg-transparent hover:bg-transparent"
                >
                  <Avatar className="w-7 h-7 lg:w-8 lg:h-8 laptop13:w-8 laptop13:h-8 fullhd:w-8 fullhd:h-8 tv:w-8 tv:h-8 border-2 border-white/30 shadow-lg">
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
      {/* Main Content - min-w-0 để tránh tràn ngang */}
      <main className="px-2 lg:px-3 xl:px-4 laptop13:px-4 fullhd:px-4 tv:px-4 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}