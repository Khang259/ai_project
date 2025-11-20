// pages/Notification.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import TableFilter from "@/components/Notification/TableFilter";
import TableNoti from "@/components/Notification/TableNoti";
import TablePagination from "@/components/Notification/TablePagination";
import { useNotifications } from "@/hooks/Notification/useNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const LIMIT = 20;

export default function Notification() {
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const {
    notifications,
    loading,
    error,
    total,
    refetch,
  } = useNotifications({
    page: currentPage,
    limit: LIMIT,
    searchQuery,
    priorityFilter,
    startDate,
    endDate,
    startTime,
    endTime,
  });

  const totalPages = Math.ceil(total / LIMIT);

  const handleReset = () => {
    setSearchQuery("");
    setPriorityFilter("all");
    setStartDate(null);
    setEndDate(null);
    setStartTime("");
    setEndTime("");
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" }); // cuộn lên đầu khi đổi trang
  };

  // Map dữ liệu backend
  const mappedNotifications = notifications.map((item) => ({
    id: `${item.alarm_code}_${item.alarm_date}`,
    messageType: item.alarm_code || "Unknown",
    alarmLevel: item.alarm_grade >= 9 ? "Alert" : item.alarm_grade >= 5 ? "Warning" : "Low",
    deviceNo: item.device_name || "--",
    deviceSerialNo: item.device_name || "--",
    abnormalReason: `${item.alarm_code} tại ${item.device_name || "thiết bị"}`,
    alarmTime: new Date(item.alarm_date).toLocaleString("vi-VN"),
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-semibold text-white mt-4 ml-4">
        {t("notification.notification")}
      </h1>

      <div className="glass rounded-lg border border-gray-200 overflow-hidden text-white p-6 m-4 mt-16">
        <TableFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
          onReset={handleReset}
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
          {!loading && !error && mappedNotifications.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-xl">Không tìm thấy cảnh báo nào</p>
            </div>
          )}

          {/* Table + Pagination */}
          {!loading && !error && mappedNotifications.length > 0 && (
            <>
              <TableNoti alerts={mappedNotifications} />

              <div className="mt-8 flex flex-col items-center gap-6">
                {/* Thông tin bản ghi */}
                <p className="text-sm text-gray-300">
                  Hiển thị {(currentPage - 1) * LIMIT + 1} -{" "}
                  {Math.min(currentPage * LIMIT, total)} trong tổng số{" "}
                  <span className="font-semibold text-white">{total}</span> cảnh báo
                </p>

                {/* Component Pagination tái sử dụng */}
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}