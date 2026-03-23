// src/pages/Area.jsx
import React, { useState } from "react";
import { toast } from "sonner";
import AreaHeader from "@/components/Area/AreaHeader";
import AreaFilters from "@/components/Area/AreaFilters";
import AreaTable from "@/components/Area/AreaTable";
import AddAreaModal from "@/components/Area/AddAreaModal";
import { useAreas } from "@/hooks/Area/useAreas";
import { useTranslation } from "react-i18next";
// import { TrophySpin } from 'react-loading-indicators';

export default function AreaDashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { t } = useTranslation();
  const {
    areas,
    search,
    setSearch,
    areaFilter,
    setAreaFilter,
    filteredAreas,
    handleDelete,
    handleAddArea,
    handleUpdateArea,
    loading,
    error,
  } = useAreas();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <div className="scale-350 translate-y-80">
          {/* <TrophySpin 
            color="rgb(41, 125, 146)" 
            size="large-lg" 
            text={t('area.loading')} 
            textColor="rgb(41, 125, 146)" 
          /> */}
        </div>
      </div>
    );
  }
  

  const handleAddAreaSubmit = async (areaData) => {
    try {
      await handleAddArea(areaData);
      toast.success("Thêm khu vực thành công");
      setIsAddModalOpen(false);
    } catch (error) {
      window.alert(error);
      toast.error(error?.message || "Thêm khu vực thất bại");
    }
  };

  const handleEditArea = async (areaId, areaData) => {
    try {
      await handleUpdateArea(areaId, areaData);
      toast.success("Cập nhật khu vực thành công");
    } catch (error) {
      console.error("Lỗi khi cập nhật area:", error);
      toast.error(error?.message || "Cập nhật khu vực thất bại");
    }
  };

  const handleDeleteArea = async (areaId) => {
    try {
      await handleDelete(areaId);
      toast.success("Xóa khu vực thành công");
    } catch (error) {
      console.error("Lỗi khi xóa area:", error);
      toast.error(error?.message || "Xóa khu vực thất bại");
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 lg:space-y-8">
      <AreaHeader onAdd={() => setIsAddModalOpen(true)} />

      <AreaFilters
        search={search}
        onSearchChange={setSearch}
        areaFilter={areaFilter}
        onAreaChange={setAreaFilter}
        areas={areas}
      />

      <AreaTable
        areas={filteredAreas.map((area) => ({
          ...area,
          areaCreatedAt: new Date(area.created_at).toLocaleString('vi-VN'),
          areaCreatedBy: area.created_by,
        }))}
        onEdit={handleEditArea}
        onDelete={handleDeleteArea}
      />

      <AddAreaModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddAreaSubmit}
        loading={loading}
      />
    </div>
  );
}
