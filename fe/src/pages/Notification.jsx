// pages/Notification.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import TableFilter from "@/components/Notification/TableFilter";
import TableNoti from "@/components/Notification/TableNoti";
import TablePagination from "@/components/Notification/TablePagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
// import { TrophySpin } from 'react-loading-indicators';
import { useNotificationFilter } from "@/hooks/Notification/useNotificationFilter";
import { useNotifications } from "@/hooks/Notification/useNotifications";

const LIMIT = 20;

export default function Notification() {
  const { t } = useTranslation();
  const [areaIdFilter, setAreaIdFilter] = useState("");

  const {
    notifications,
    loading,
    error,
    total: totalNotifications,
    refetch,
  } = useNotifications({
    page: 1,
    limit: 1000,
    filters: areaIdFilter ? { area_id: areaIdFilter } : {},
  });

  const {
    searchNotificationProperty,
    setSearchNotificationProperty,
    priorityFilter,
    setPriorityFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    currentPage,
    totalPages,
    paginatedNotifications,
    total,
    handlePageChange,
    handleReset,
    hasActiveFilters,
  } = useNotificationFilter(notifications, LIMIT);

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

  return (
    <div className="space-y-8">
      <h1 className="text-3xl lg:text-4xl font-semibold text-white mt-4 ml-4">
        {t('notification.management')}
      </h1>

      <div className="glass rounded-lg border border-gray-200 overflow-hidden text-white p-6 lg:p-8 m-4 lg:m-6 mt-12 lg:mt-16">
        <TableFilter
          searchNotificationProperty={searchNotificationProperty}
          setSearchNotificationProperty={setSearchNotificationProperty}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          onReset={handleReset}
          areaIdFilter={areaIdFilter}
          setAreaIdFilter={setAreaIdFilter}
        />

        <div className="mt-8">
          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-12">
              <p className="text-red-400 text-lg mb-4">Không thể tải dữ liệu</p>
              <Button onClick={refetch} variant="outline">Thử lại</Button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && paginatedNotifications.length === 0 && (
            <div className="text-center py-16 text-white">
              <p className="text-xl">Không tìm thấy</p>
            </div>
          )}

          {/* Table + Pagination */}
          {!loading && !error && paginatedNotifications.length > 0 && (
            <>
              <TableNoti alerts={paginatedNotifications} />

              <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  total={total}
                  totalNotifications={totalNotifications}
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