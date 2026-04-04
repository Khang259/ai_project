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

  return (
    <div className="flex flex-col items-center gap-6 mt-6">
      {total !== undefined && (
        <p className="text-base lg:text-lg text-white">
          Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{" "}
          {Math.min(currentPage * itemsPerPage, total)} trong tổng số{" "}
          <span className="font-semibold text-white">{total}</span> tác vụ
          {hasActiveFilters && totalTasks && ` (đã lọc từ ${totalTasks} tác vụ)`}
        </p>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent className="flex-wrap gap-1.5 lg:gap-2 items-center justify-center">
            {/* Previous - tách biệt bên trái */}
            <PaginationItem className="mr-4 lg:mr-5">
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                className={[
                  "text-base lg:text-lg h-10 lg:h-11 min-w-[4rem] sm:min-w-[5rem] rounded-md border border-gray-500",
                  currentPage === 1
                    ? "pointer-events-none opacity-50 bg-gray-700/60 text-gray-500"
                    : "cursor-pointer bg-gray-600 hover:bg-gray-500 text-gray-100",
                ].join(" ")}
              />
            </PaginationItem>

            {/* Các số trang */}
            {getPageNumbers().map((page, index) =>
              page === "..." ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis className="h-10 w-10 lg:h-11 lg:w-11 text-base lg:text-lg bg-gray-600/80 text-gray-400 rounded-md border border-gray-500" />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => onPageChange(page)}
                    isActive={currentPage === page}
                    className={[
                      "cursor-pointer text-base lg:text-lg h-10 w-10 lg:h-11 lg:w-11 rounded-md border",
                      currentPage === page
                        ? "bg-white text-gray-900 border-white hover:bg-gray-100"
                        : "bg-gray-600 hover:bg-gray-500 text-gray-100 border-gray-500",
                    ].join(" ")}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            {/* Next - tách biệt bên phải */}
            <PaginationItem className="ml-4 lg:ml-5">
              <PaginationNext
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                className={[
                  "text-base lg:text-lg h-10 lg:h-11 min-w-[4rem] sm:min-w-[5rem] rounded-md border border-gray-500",
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50 bg-gray-700/60 text-gray-500"
                    : "cursor-pointer bg-gray-600 hover:bg-gray-500 text-gray-100",
                ].join(" ")}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}