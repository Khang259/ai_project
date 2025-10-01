import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Home, Workflow, BarChart3, Settings, Users, Database } from "lucide-react";
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

const navigation = [
  { name: "Tổng quan", href: "/dashboard", icon: Home },
  { name: "Quản lý nhiệm vụ", href: "/task", icon: Workflow },
  { name: "Thống kê", href: "/analytics", icon: BarChart3 },
  { name: "Thông báo", href: "/notification", icon: Database },
  { name: "Quản lý người dùng", href: "/users", icon: Users },
  { name: "Cài đặt", href: "/settings", icon: Settings },
];

export default function DashboardLayout({ children }) {  // Bỏ interface, dùng { children }
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { auth, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
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
          
          {/* Navigation trong header */}
          <nav className="flex items-center space-x-1">
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
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback>AE</AvatarFallback>
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