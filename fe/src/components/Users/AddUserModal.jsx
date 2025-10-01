import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

export default function AddUserModal({ isOpen, onClose, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    roles: ["user"], // Default role theo backend
    permissions: []
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = "Tên người dùng là bắt buộc";
    } else if (formData.username.length < 3) {
      newErrors.username = "Tên người dùng phải có ít nhất 3 ký tự";
    }
    
    if (!formData.password.trim()) {
      newErrors.password = "Mật khẩu là bắt buộc";
    } else if (formData.password.length < 3) {
      newErrors.password = "Mật khẩu phải có ít nhất 3 ký tự";
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
      roles: ["user"]
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
            <CardTitle>Thêm người dùng mới</CardTitle>
            <CardDescription>
              Tạo tài khoản người dùng mới trong hệ thống
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên người dùng *</Label>
              <Input
                id="username"
                type="text"
                placeholder="Nhập tên người dùng"
                style={{ backgroundColor: "#fff" }} // Đổi màu nền placeholder
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            <div >
              <Label htmlFor="password">Mật khẩu *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Nhập mật khẩu"
                style={{ backgroundColor: "#fff" }} // Đổi màu nền placeholder
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="roles">Vai trò *</Label>
              <Select
                value={formData.roles[0] || "user"}
                onValueChange={(value) => handleInputChange("roles", [value])}
              >
                <SelectTrigger style={{ backgroundColor: "#fff" }}>
                  <SelectValue placeholder="Chọn role" />
                </SelectTrigger>
                <SelectContent>
                  {/* <SelectItem value="viewer">Viewer</SelectItem> */}
                  <SelectItem value="admin">Admin</SelectItem>
                  {/* <SelectItem value="manager">Manager</SelectItem> */}
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang tạo..." : "Tạo người dùng"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
