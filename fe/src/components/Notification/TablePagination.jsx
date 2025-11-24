// components/Notification/TablePagination.jsx
import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  maxVisible = 5,
  total,
  totalTasks,
  hasActiveFilters,
  itemsPerPage = 20,
}) {
  const getPageNumbers = () => {
    const pages = [];

    if (totalPages <= maxVisible) {
      // Nếu tổng số trang ít hơn hoặc bằng maxVisible → hiện hết
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Logic hiển thị đẹp: 1 ... 48 49 50 ... 100
      if (currentPage <= Math.ceil(maxVisible / 2)) {
        // Gần đầu
        for (let i = 1; i <= maxVisible - 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - Math.floor(maxVisible / 2)) {
        // Gần cuối
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - (maxVisible - 2); i <= totalPages; i++) pages.push(i);
      } else {
        // Ở giữa
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1 && !total) return null; // không hiện nếu chỉ có 1 trang

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Total items info */}
      {total !== undefined && (
        <p className="text-sm text-gray-300">
          Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{" "}
          {Math.min(currentPage * itemsPerPage, total)} trong tổng số{" "}
          <span className="font-semibold text-white">{total}</span> tác vụ
          {hasActiveFilters && totalTasks && ` (đã lọc từ ${totalTasks} tác vụ)`}
        </p>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            {/* Nút Previous */}
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-accent"}
              />
            </PaginationItem>

            {/* Các số trang */}
            {getPageNumbers().map((page, index) =>
              page === "..." ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => onPageChange(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            {/* Nút Next */}
            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-accent"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}