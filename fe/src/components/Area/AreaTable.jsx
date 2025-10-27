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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useZipImport from "@/hooks/MapDashboard/useZipImport";

const AreaTable = ({ areas, onEdit, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Thêm state giống như AMRWarehouseMap
  const [mapData, setMapData] = useState(null);
  const [securityConfig, setSecurityConfig] = useState(null);
  const [selectedAvoidanceMode, setSelectedAvoidanceMode] = useState(1);
  const [editingAreaId, setEditingAreaId] = useState(null);

  const totalPages = Math.ceil(areas.length / itemsPerPage);
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

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="">
              <TableHead className="font-semibold text-gray-900">Area ID</TableHead>
              <TableHead className="font-semibold text-gray-900">Area Name</TableHead>
              <TableHead className="font-semibold text-gray-900">Area Description</TableHead>
              <TableHead className="font-semibold text-gray-900">Associated Account</TableHead>
              <TableHead className="font-semibold text-gray-900">Associated Device</TableHead>
              <TableHead className="font-semibold text-gray-900">Operation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentAreas.map((area) => (
              <TableRow key={area.area_id} className="">
                <TableCell className="font-medium text-gray-900">
                  {area.area_id}
                </TableCell>
                <TableCell className="text-gray-700">
                  {area.area_name}
                </TableCell>
                <TableCell className="text-gray-700">
                  {area.areaDescription}
                </TableCell>
                <TableCell className="text-gray-700">
                  {area.associatedAccount}
                </TableCell>
                <TableCell className="text-gray-700">
                  {area.associatedDevice}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="link"
                      className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                      onClick={() => onEdit(area.area_id, area)}
                    >
                      Details
                    </Button>
                    <Button
                      variant="link"
                      className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                      onClick={() => handleEditClick(area)} // Sử dụng function mới
                    >
                      Edit
                    </Button>
                    <Button
                      variant="link"
                      className="text-red-600 hover:text-red-800 p-0 h-auto"
                      onClick={() => onDelete(area.area_id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="p-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Page</span>
            <div className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">
              {currentPage}
            </div>
            <span className="text-sm text-gray-700">of {totalPages}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Items per page:</span>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
              <span className="text-blue-700">Đang tải file ZIP...</span>
            </div>
          )}

          {saveToBackendLoading && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
              <span className="text-yellow-700">Đang lưu bản đồ lên server...</span>
            </div>
          )}

          {zipError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg">
              <span className="text-red-700">❌ {zipError}</span>
            </div>
          )}

          {saveToBackendError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg">
              <span className="text-red-700">❌ Lỗi lưu server: {saveToBackendError}</span>
            </div>
          )}

          {zipFileName && !saveToBackendError && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg shadow-lg">
              <span className="text-green-700">✅ Đã import thành công: {zipFileName}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AreaTable;
