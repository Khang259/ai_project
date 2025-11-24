// pages/TaskManagement.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import TaskTable from "@/components/TaskManagement/TaskTable";
import TaskFilter from "@/components/TaskManagement/TaskFilter";
import TablePagination from "@/components/Notification/TablePagination";
import { useTaskRecord } from "@/hooks/TaskRecord/useTaskRecord";
import { useTaskFilter } from "@/hooks/TaskRecord/useTaskFilter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const LIMIT = 20;

export default function TaskManagement() {
  const { t } = useTranslation();

  const {
    tasks,
    loading,
    error,
    total: totalTasks,
    refetch,
  } = useTaskRecord({
    page: 1,
    limit: 1000,
    filters: {},
  });

  const {
    orderIdFilter,
    setOrderIdFilter,
    deviceNumFilter,
    setDeviceNumFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    currentPage,
    totalPages,
    paginatedTasks,
    total,
    handlePageChange,
    handleReset,
    hasActiveFilters,
  } = useTaskFilter(tasks, LIMIT);

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-semibold text-white mt-4 ml-4">
        {t("taskManagement.taskManagement")}
      </h1>

      <div className="glass rounded-lg border border-gray-200 overflow-hidden text-white p-6 m-4 mt-16">
        <TaskFilter
          orderIdFilter={orderIdFilter}
          setOrderIdFilter={setOrderIdFilter}
          deviceNumFilter={deviceNumFilter}
          setDeviceNumFilter={setDeviceNumFilter}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          onReset={handleReset}
        />

        <div className="mt-8">
          {loading && (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-400 text-lg mb-4">Không thể tải dữ liệu</p>
              <Button onClick={refetch} variant="outline">Thử lại</Button>
            </div>
          )}

          {!loading && !error && paginatedTasks.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-xl">
                {hasActiveFilters
                  ? "Không tìm thấy tác vụ nào phù hợp với bộ lọc"
                  : "Không tìm thấy tác vụ nào"}
              </p>
            </div>
          )}

          {!loading && !error && paginatedTasks.length > 0 && (
            <>
              <TaskTable tasks={paginatedTasks} />

              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                total={total}
                totalTasks={totalTasks}
                hasActiveFilters={hasActiveFilters}
                itemsPerPage={LIMIT}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}