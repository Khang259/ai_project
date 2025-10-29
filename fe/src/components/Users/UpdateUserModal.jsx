import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { getRoles } from "@/services/roles";
import { useTranslation } from "react-i18next";
export default function UpdateUserModal({ isOpen, onClose, onSubmit, loading, userData }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: "",
    roles: [], // Sẽ được set từ API
    permissions: []
  });

  const [errors, setErrors] = useState({});
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userData) {
      setFormData({
        username: userData.username || "",
        roles: Array.isArray(userData.roles) && userData.roles.length > 0 ? [userData.roles[0]] : ["user"],
        permissions: userData.permissions || []
      });
    }
  }, [isOpen, userData]);

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

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username.trim()) {
      newErrors.username = t('users.usernameRequired');
    } else if (formData.username.length < 3) {
      newErrors.username = t('users.usernameMinLength');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        username: formData.username,
        roles: formData.roles
      });
    }
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

  const handleClose = () => {
    setFormData({
      username: "",
      roles: ["user"]
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 bg-gray-400" style={{ borderRadius: "30px" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{t('users.updateUser')}</CardTitle>
            <CardDescription>
              {t('users.updateUserDescription')}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('users.username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t('users.usernamePlaceholder')}
                style={{ backgroundColor: "#fff" }} // Đổi màu nền placeholder
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            {/* Password không cập nhật tại đây, tách riêng endpoint đổi mật khẩu */}

            <div className="space-y-2">
              <Label htmlFor="roles">{t('users.role')}</Label>
              <Select
                value={formData.roles[0] || ""}
                onValueChange={(value) => handleInputChange("roles", [value])}
                disabled={rolesLoading}
              >
                <SelectTrigger style={{ backgroundColor: "#fff" }}>
                  <SelectValue placeholder={rolesLoading ? t('users.loadingRoles') : t('users.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id} >
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roles && (
                <p className="text-sm text-red-500">{errors.roles}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('users.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('users.loading') : t('users.updateUser')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
