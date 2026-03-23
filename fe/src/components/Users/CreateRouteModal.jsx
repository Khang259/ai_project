import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CreateRouteModal({ isOpen, onClose, onSubmit, loading }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    groupId: "",
    routeName: "",
    numberOfRoutes: ""
  });
  
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
    
    if (!formData.routeName.trim()) {
      newErrors.routeName = t('users.routeNameRequired');
    } else if (formData.routeName.length < 3) {
      newErrors.routeName = t('users.routeNameMinLength');
    }
    
    if (!formData.numberOfRoutes.trim()) {
      newErrors.numberOfRoutes = t('users.numberOfRoutesRequired');
    } else if (isNaN(formData.numberOfRoutes) || parseInt(formData.numberOfRoutes) <= 0) {
      newErrors.numberOfRoutes = t('users.numberOfRoutesMustBeAPositiveNumber');
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
      routeName: "",
      groupId: "",
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
            <CardTitle>{t('users.createRoute')}</CardTitle>
            <CardDescription>
              {t('users.createRouteDescription')}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="routeName">{t('users.routeName')}</Label>
              <Input
                id="routeName"
                type="text"
                placeholder={t('users.routeNamePlaceholder')}
                style={{ backgroundColor: "#fff" }}
                value={formData.routeName}
                onChange={(e) => handleInputChange("routeName", e.target.value)}
                className={errors.routeName ? "border-red-500" : ""}
              />
              {errors.routeName && (
                <p className="text-sm text-red-500">{errors.routeName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupId">{t('users.groupId')}</Label>
              <Input
                id="groupId"
                type="text"
                placeholder={t('users.groupIdPlaceholder')}
                style={{ backgroundColor: "#fff" }}
                value={formData.groupId}
                onChange={(e) => handleInputChange("groupId", e.target.value)}
                className={errors.groupId ? "border-red-500" : ""}
              />
              {errors.groupId && (
                <p className="text-sm text-red-500">{errors.groupId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfRoutes">{t('users.numberOfRoutes')}</Label>
              <Input
                id="numberOfRoutes"
                type="number"
                placeholder={t('users.numberOfRoutesPlaceholder')}
                style={{ backgroundColor: "#fff" }}
                value={formData.numberOfRoutes}
                onChange={(e) => handleInputChange("numberOfRoutes", e.target.value)}
                className={errors.numberOfRoutes ? "border-red-500" : ""}
              />
              {errors.numberOfRoutes && (
                <p className="text-sm text-red-500">{errors.numberOfRoutes}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('users.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('users.loading') : t('users.createRoute')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}