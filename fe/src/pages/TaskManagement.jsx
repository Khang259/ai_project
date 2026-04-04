// pages/TaskManagement.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import TaskTable from "@/components/TaskManagement/TaskTable";
import TaskFilter from "@/components/TaskManagement/TaskFilter";
import TablePagination from "@/components/Notification/TablePagination";
import { useTaskRecord } from "@/hooks/TaskRecord/useTaskRecord";
import { useTaskFilter } from "@/hooks/TaskRecord/useTaskFilter";
import { useArea } from "@/contexts/AreaContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
// import { TrophySpin } from 'react-loading-indicators';

const LIMIT = 20;

export default function TaskManagement() {
  const { t } = useTranslation();
  const { currAreaId } = useArea();
  const areaId = currAreaId != null ? String(currAreaId) : "";

  const {
    tasks,
    loading,
    error,
    total: totalTasks,
    refetch,
  } = useTaskRecord({
    page: 1,
    limit: 20,
    filters: {
      ...(areaId ? { area_id: areaId } : {}),
      today_only: true,
    },
  });

  const {
    searchTaskProperty,
    setSearchTaskProperty,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    statusFilter,
    setStatusFilter,
    currentPage,
    totalPages,
    paginatedTasks,
    total,
    handlePageChange,
    handleReset,
    hasActiveFilters,
  } = useTaskFilter(tasks, LIMIT);

  const handleResetAll = () => handleReset();

  if (loading) {

    return (
      <div className="flex flex-col items-center justify-center p-6">
        <div className="scale-350 translate-y-80">
          {/* <TrophySpin 
            color="rgb(41, 125, 146)" 
            size="large-lg" 
            text={t('taskManagement.loading')} 
            textColor="rgb(41, 125, 146)" 
          /> */}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <h1 className="text-3xl lg:text-4xl font-semibold text-white mt-4 ml-4">
        {t('taskManagement.taskManagement')}
      </h1>

      <div className="glass rounded-lg border border-gray-200 overflow-hidden text-white p-6 lg:p-8 m-4 lg:m-6 mt-12 lg:mt-16">
        <TaskFilter
          searchTaskProperty={searchTaskProperty}
          setSearchTaskProperty={setSearchTaskProperty}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onReset={handleResetAll}
        />

        <div className="mt-4 mb-2 text-base lg:text-lg text-white">
          {hasActiveFilters
            ? t("taskManagement.foundCount", { count: total, total: totalTasks })
            : t("taskManagement.totalCount", { count: total })}
        </div>

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