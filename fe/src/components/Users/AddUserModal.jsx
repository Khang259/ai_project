import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { getRoles } from "@/services/roles";
import { useTranslation } from "react-i18next";

export default function AddUserModal({ isOpen, onClose, onSubmit, loading }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    roles: [], // Sẽ được set từ API
    permissions: []
  });
  
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
    
    if (!formData.password.trim()) {
      newErrors.password = t('users.passwordRequired');
    } else if (formData.password.length < 3) {
      newErrors.password = t('users.passwordMinLength');
    }
    
    if (!formData.roles || formData.roles.length === 0) {
      newErrors.roles = t('users.roleRequired');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
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
      password: "",
      roles: [],
      permissions: []
    });
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
            <div className="space-y-2">
              <Label htmlFor="username">{t('users.username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t('users.usernamePlaceholder')}
                style={{ backgroundColor: "#fff" }}
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('users.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('users.passwordPlaceholder')}
                style={{ backgroundColor: "#fff" }}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

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