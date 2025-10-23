import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Home, Workflow, BarChart3, Settings, Users, ChevronDown, Map } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { useArea } from "@/contexts/AreaContext";

const navigation = [
  { name: "Tổng quan", href: "/dashboard", icon: Home },
  { name: "Quản lý nhiệm vụ", href: "/task", icon: Workflow },
  { name: "Thống kê", href: "/analytics", icon: BarChart3 },
  { name: "Thông báo", href: "/notification", icon: Bell },
  { name: "Quản lý người dùng", href: "/users", icon: Users },
  { name: "Quản lý khu vực", href: "/area", icon: Map },
  { name: "Cài đặt", href: "/settings", icon: Settings },

];

export default function DashboardLayout({ children }) {  // Bỏ interface, dùng { children }
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const { areaData, currAreaName, setCurrAreaName, setCurrAreaId, loading: areaLoading, error: areaError } = useArea();

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
      return !['Quản lý người dùng', 'Cài đặt'].includes(item.name);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-white">
      
      <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <img src="/src/assets/logo_cty.png" alt="Company Logo" className="w-60 h-12" />
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2" disabled={areaLoading}>
                  <span className="font-medium">
                    {areaLoading ? "Đang tải..." : areaError ? "Lỗi tải areas" : `Khu vực: ${currAreaName || "Chưa chọn"}`}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Chọn khu vực</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {areaLoading ? (
                  <DropdownMenuItem disabled>
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Đang tải areas...
                    </div>
                  </DropdownMenuItem>
                ) : areaError ? (
                  <DropdownMenuItem disabled className="text-red-500">
                    ❌ {areaError}
                  </DropdownMenuItem>
                ) : areaData.length === 0 ? (
                  <DropdownMenuItem disabled>
                    Không có area nào
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
          <nav className="flex items-center space-x-1 px-8 gap-8">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[rgb(34,189,189)/.1] text-[rgb(34,189,189)] hover:bg-[rgb(34,189,189)/.2]"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="w-7 h-7 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
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
              <DropdownMenuLabel>{auth.user?.username || 'User'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Đăng xuất</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-gray-50 min-h-[calc(100vh-4rem)]">{children}</main>

    </div>
  );
}