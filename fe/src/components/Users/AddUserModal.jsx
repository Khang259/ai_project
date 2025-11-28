import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { getRoles } from "@/services/roles";
import { useTranslation } from "react-i18next";
import { useRoute } from "@/hooks/Setting/useRoute";
import { useAuth } from "@/hooks/useAuth";
import { useArea } from "@/contexts/AreaContext";

export default function AddUserModal({ isOpen, onClose, onSubmit, loading }) {
  const { t } = useTranslation();
  const { auth } = useAuth();

  const currentUsername = auth?.user?.username || "";
  const currentUser = auth?.user || {};

  const { routes, loading: routesLoading, getRoutesByCreator } = useRoute();
  const { areaData, loading: areaLoading } = useArea();
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    roles: [], // Sẽ được set từ API
    area: 0, // area sẽ được lấy theo currentUsername hoặc admin chọn
    group_id: 0, // group_id sẽ được lấy theo currentUsername hoặc admin chọn
    route: [] // route sẽ được lấy theo người dùng operator tạo trước đó
  });
  
  const isAdmin = auth.user?.roles?.includes('admin');
  const isOperator = auth.user?.roles?.includes('operator');

  const valueGroupID = auth.user?.group_id;
  const valueAreaID = auth.user?.area;

  // Load roles khi modal mở
  useEffect(() => {
    const loadRoles = async () => {
      if (isOpen) {
        try {
          setRolesLoading(true);
          const rolesData = await getRoles();
          setRoles(rolesData || []);
        } catch (error) {
          console.error("Error loading roles:", error);
          setErrors(prev => ({
            ...prev,
            roles: t('users.roleLoadingError')
          }));
        } finally {
          setRolesLoading(false);
        }
      }
    };

    loadRoles();
  }, [isOpen]);


  // Load routes theo người tạo hiện tại - chỉ cho operator
  useEffect(() => {
    const fetchRoutes = async () => {
      if (!isOpen || !currentUsername || !isOperator || isAdmin) return;
      try {
        const fetchedRoutes = await getRoutesByCreator(currentUsername);
      } catch (error) {
        console.error("[AddUserModal] Error loading routes:", error);
      }
    };

    fetchRoutes();
  }, [isOpen, currentUsername, isOperator, isAdmin]);


  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = t('users.usernameRequired');
    } else if (formData.username.length < 3) {
      newErrors.username = t('users.usernameMinLength');
    }
    
    if (!formData.password.trim()) {
      newErrors.password = t('users.passwordRequired');
    } else if (formData.password.length < 3) {
      newErrors.password = t('users.passwordMinLength');
    }
    
    // Chỉ validate roles nếu user có quyền chọn roles (admin)
    if (isAdmin && (!formData.roles || formData.roles.length === 0)) {
      newErrors.roles = t('users.roleRequired');
    }

    // Chỉ validate area cho admin (operator tự động có từ currentUser)
    if (isAdmin && (!formData.area || formData.area === 0)) {
      newErrors.area = t('users.areaRequired') || 'Vui lòng chọn khu vực';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const valueRouteId = formData.route?.[0] || "";
      console.log("[AddUserModal] Value Route ID:", valueRouteId);
      onSubmit({
        ...formData,
        group_id: valueGroupID,
        area_id: valueAreaID,
        route_id: valueRouteId
      });
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 bg-gray-300" style={{ borderRadius: "30px" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{t('users.addUser')}</CardTitle>
            <CardDescription>
              {t('users.addUserDescription')}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">{t('users.username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t('users.usernamePlaceholder')}
                style={{ backgroundColor: "#fff", width: "100%", borderRadius: "16px" }}
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            {/* Password: */}
            <div className="space-y-2">
              <Label htmlFor="password">{t('users.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('users.passwordPlaceholder')}
                style={{ backgroundColor: "#fff", width: "100%", borderRadius: "16px" }}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>
            
            {/* Route Select - Chỉ hiển thị cho Operator */}
            {isOperator && !isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="routes">{t('users.route')}</Label>
                <Select
                  value={formData.route?.[0]?.toString() || ""}
                  onValueChange={(value) => handleInputChange("route", [value])}
                  disabled={routesLoading || routes.length === 0}
                >
                  <SelectTrigger style={{ backgroundColor: "#fff", width: "100%", borderRadius: "16px" }}>
                    <SelectValue
                      placeholder={
                        routesLoading
                          ? t('users.loadingRoutes')
                          : routes.length === 0
                            ? t('users.noRoutes')
                            : t('users.selectRoute')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={String(route.route_id)}>
                        {route.route_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.route && (
                  <p className="text-sm text-red-500">{errors.route}</p>
                )}
              </div>
            )}

            {/* Hiển thị thông tin route cho admin */}
            {isAdmin && (
              <div className="space-y-2">
                <Label>{t('users.route') || 'Tuyến đường'}</Label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg border">
                  <span className="text-sm text-gray-600">
                    {t('users.adminRouteNote') || 'Admin tạo user không cần gán route - để trống'}
                  </span>
                </div>
              </div>
            )}

            {/* Roles */}
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="roles">{t('users.role')}</Label>
                <Select
                  value={formData.roles[0] || ""}
                  onValueChange={(value) => handleInputChange("roles", [value])}
                  disabled={rolesLoading}
                >
                  <SelectTrigger style={{ backgroundColor: "#fff", width: "100%", borderRadius: "16px" }}>
                    <SelectValue placeholder={rolesLoading ? t('users.loadingRoles') : t('users.selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.roles && (
                  <p className="text-sm text-red-500">{errors.roles}</p>
                )}
              </div>
            )}

            {/* Hiển thị role đã được tự động chọn cho operator */}
            {isOperator && !isAdmin && (
              <div className="space-y-2">
                <Label>{t('users.role')}</Label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg border">
                  <span className="text-sm text-gray-600">
                    {t('users.autoAssignedRole')}: <strong>User</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Area Selection - Chỉ hiển thị cho Admin */}
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="area">{t('users.area') || 'Khu vực'}</Label>
                <Select
                  value={formData.area?.toString() || ""}
                  onValueChange={(value) => {
                    const areaId = parseInt(value);
                    handleInputChange("area", areaId);
                    // Tự động set group_id = area_id
                    handleInputChange("group_id", areaId);
                  }}
                  disabled={areaLoading || areaData.length === 0}
                >
                  <SelectTrigger style={{ backgroundColor: "#fff", width: "100%", borderRadius: "16px" }}>
                    <SelectValue
                      placeholder={
                        areaLoading
                          ? t('users.loadingAreas') || 'Đang tải khu vực...'
                          : areaData.length === 0
                            ? t('users.noAreas') || 'Không có khu vực'
                            : t('users.selectArea') || 'Chọn khu vực'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {areaData.map((area) => (
                      <SelectItem key={area.area_id} value={area.area_id.toString()}>
                        {area.area_name} (ID: {area.area_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.area && (
                  <p className="text-sm text-red-500">{errors.area}</p>
                )}
              </div>
            )}

            {/* Hiển thị thông tin area và group_id cho operator */}
            {isOperator && !isAdmin && (
              <div className="space-y-2">
                <Label>{t('users.areaAndGroup') || 'Khu vực & Nhóm'}</Label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg border">
                  <span className="text-sm text-gray-600">
                    {t('users.autoAssignedArea') || 'Tự động gán'}: <strong>Area {currentUser.area || 0}, Group {currentUser.group_id || 0}</strong>
                  </span>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('users.cancel')}
            </Button>
            <Button type="submit" disabled={loading || rolesLoading}>
              {loading ? t('users.loading') : t('users.createUser')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}