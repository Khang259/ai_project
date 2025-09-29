import React from "react";
import { Button } from "@/components/ui/button";

export default function UsersHeader({ onAdd }) {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-4xl font-semibold text-gray-900">Trang quản lý người dùng</h1>
      <Button onClick={onAdd}>Add User</Button>
    </div>
  );
}


