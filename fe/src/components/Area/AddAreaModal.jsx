// src/components/Area/AddAreaModal.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
const AddAreaModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    area_id: "",
    area_name: "",
  });

  const [errors, setErrors] = useState({});

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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.area_id.trim()) {
      newErrors.area_id = t('area.areaIdRequired');
    } else if (isNaN(formData.area_id) || parseInt(formData.area_id) <= 0) {
      newErrors.area_id = t('area.areaIdMustBeAPositiveNumber');
    }
    
    if (!formData.area_name.trim()) {
      newErrors.area_name = t('area.areaNameRequired');
    } else if (formData.area_name.trim().length < 2) {
      newErrors.area_name = t('area.areaNameMustBeAtLeast2Characters');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await onSubmit({
        area_id: parseInt(formData.area_id),
        area_name: formData.area_name.trim(),
      });
      
      // Reset form
      setFormData({
        area_id: "",
        area_name: "",
      });
      setErrors({});
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const handleClose = () => {
    setFormData({
      area_id: "",
      area_name: "",
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('area.addNewArea')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="area_id">{t('area.areaId')}</Label>
            <Input
              id="area_id"
              type="number"
              value={formData.area_id}
              onChange={(e) => handleInputChange("area_id", e.target.value)}
              placeholder={t('area.enterAreaId')}
              className={errors.area_id ? "border-red-500" : ""}
            />
            {errors.area_id && (
              <p className="text-sm text-red-500">{errors.area_id}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="area_name">{t('area.areaName')}</Label>
            <Input
              id="area_name"
              type="text"
              value={formData.area_name}
              onChange={(e) => handleInputChange("area_name", e.target.value)}
              placeholder={t('area.enterAreaName')}
              className={errors.area_name ? "border-red-500" : ""}
            />
            {errors.area_name && (
              <p className="text-sm text-red-500">{errors.area_name}</p>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              {t('area.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? t('area.loading') : t('area.addArea')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAreaModal;
