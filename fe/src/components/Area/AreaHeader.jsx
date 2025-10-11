// src/components/Area/AreaHeader.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const AreaHeader = ({ onAdd }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Quản lý khu vực</h1>
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          onClick={onAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm khu vực
        </Button>
      </div>
    </div>
  );
};

export default AreaHeader;
