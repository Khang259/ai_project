// src/components/Area/AreaTable.jsx
import React, { useState } from "react";
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

const AreaTable = ({ areas, onEdit, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const totalPages = Math.ceil(areas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAreas = areas.slice(startIndex, endIndex);

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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
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
              <TableRow key={area.area_id} className="hover:bg-gray-50">
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
                      onClick={() => onEdit(area.area_id, area)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="link"
                      className="text-blue-600 hover:text-blue-800 p-0 h-auto"
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
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
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
    </div>
  );
};

export default AreaTable;
