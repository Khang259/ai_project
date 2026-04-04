// src/components/Area/AreaTable.jsx
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useZipImport from "@/hooks/MapDashboard/useZipImport";
import { useTranslation } from "react-i18next";

const AreaTable = ({ areas, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Thêm state giống như AMRWarehouseMap
  const [mapData, setMapData] = useState(null);
  const [securityConfig, setSecurityConfig] = useState(null);
  const [selectedAvoidanceMode, setSelectedAvoidanceMode] = useState(1);
  const [editingAreaId, setEditingAreaId] = useState(null);

  // const totalPages = Math.ceil(areas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAreas = areas.slice(startIndex, endIndex);

  const { loading: zipLoading, error: zipError, zipFileName, handleZipImport, saveToBackendLoading, saveToBackendError } = useZipImport();

  const zipFileInputRef = useRef(null);

  // Xử lý khi click Edit - lưu area_id và mở file picker
  const handleEditClick = (area) => {
    // Lưu area_id vào data attribute
    if (zipFileInputRef.current) {
      zipFileInputRef.current.setAttribute('data-area-id', area.area_id);
      // Mở file picker
      zipFileInputRef.current.click();
    }
  };

  const handleZipFileChange = (e) => {
    const file = e.target.files[0];
    const areaId = e.target.getAttribute('data-area-id');

    if (file && areaId) {
      // Tạo các function dummy để tránh lỗi
      const dummySetMapData = (data) => {
        console.log('Map data received:', data);
        localStorage.setItem('importedMapData', JSON.stringify(data));
      };

      const dummySetSecurityConfig = (config) => {
        console.log('Security config received:', config);
        localStorage.setItem('importedSecurityConfig', JSON.stringify(config));
      };

      const dummySetSelectedAvoidanceMode = (mode) => {
        console.log('Avoidance mode received:', mode);
      };

      // Gọi handleZipImport với area_id cụ thể
      handleZipImport(
        file,
        dummySetMapData,
        dummySetSecurityConfig,
        dummySetSelectedAvoidanceMode,
        parseInt(areaId)
      );

      alert(`Đang import bản đồ cho Area ${areaId}...`);
    }
    // Reset input để có thể chọn cùng file lần nữa
    e.target.value = '';
  };

  const thClass = "font-semibold text-white py-3 px-3 lg:py-4 lg:px-4 text-base lg:text-lg";
  const tdClass = "text-white py-3 px-3 lg:py-4 lg:px-4 text-base lg:text-lg";

  return (
    <div className="glass rounded-lg border border-gray-200 overflow-hidden text-white p-4 lg:p-6">
      <div className="overflow-x-auto">
        <Table className="text-base lg:text-lg">
          <TableHeader>
            <TableRow className="text-white">
              <TableHead className={thClass}>{t('area.areaId')}</TableHead>
              <TableHead className={thClass}>{t('area.areaName')}</TableHead>
              <TableHead className={thClass}>{t('area.createdBy')}</TableHead>
              <TableHead className={thClass}>{t('area.createdAt')}</TableHead>
              <TableHead className={thClass}>{t('area.operation')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentAreas.map((area) => (
              <TableRow key={area.area_id}>
                <TableCell className={`font-medium ${tdClass}`}>
                  {area.area_id}
                </TableCell>
                <TableCell className={tdClass}>{area.area_name}</TableCell>
                <TableCell className={tdClass}>{area.created_by}</TableCell>
                <TableCell className={tdClass}>{area.areaCreatedAt}</TableCell>
                <TableCell className={tdClass}>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="text-sm lg:text-base h-9 lg:h-10 px-3"
                      onClick={() => handleEditClick(area)}
                    >
                      {t('area.edit')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-sm lg:text-base h-9 lg:h-10 px-3"
                      onClick={() => onDelete(area.id)}
                    >
                      {t('area.delete')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <input
        ref={zipFileInputRef}
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={handleZipFileChange}
      />

      {/* Status Messages */}
      {(zipLoading || saveToBackendLoading || zipError || saveToBackendError || zipFileName) && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {zipLoading && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-blue-700">{t('area.loadingZip')}</span>
            </div>
          )}

          {saveToBackendLoading && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
              <span className="text-yellow-700">{t('area.loadingSave')}</span>
            </div>
          )}

          {zipError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg">
              <span className="text-red-700">❌ {zipError}</span>
            </div>
          )}

          {saveToBackendError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg">
              <span className="text-red-700">❌ {t('area.saveError')}: {saveToBackendError}</span>
            </div>
          )}

          {zipFileName && !saveToBackendError && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg shadow-lg">
              <span className="text-green-700">✅ {t('area.importSuccess')}: {zipFileName}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AreaTable;
