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

const AddAreaModal = ({ isOpen, onClose, onSubmit, loading }) => {
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
      newErrors.area_id = "Area ID is required";
    } else if (isNaN(formData.area_id) || parseInt(formData.area_id) <= 0) {
      newErrors.area_id = "Area ID must be a positive number";
    }
    
    if (!formData.area_name.trim()) {
      newErrors.area_name = "Area Name is required";
    } else if (formData.area_name.trim().length < 2) {
      newErrors.area_name = "Area Name must be at least 2 characters";
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
          <DialogTitle>Add New Area</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="area_id">Area ID</Label>
            <Input
              id="area_id"
              type="number"
              value={formData.area_id}
              onChange={(e) => handleInputChange("area_id", e.target.value)}
              placeholder="Enter area ID"
              className={errors.area_id ? "border-red-500" : ""}
            />
            {errors.area_id && (
              <p className="text-sm text-red-500">{errors.area_id}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="area_name">Area Name</Label>
            <Input
              id="area_name"
              type="text"
              value={formData.area_name}
              onChange={(e) => handleInputChange("area_name", e.target.value)}
              placeholder="Enter area name"
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
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Adding..." : "Add Area"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAreaModal;
