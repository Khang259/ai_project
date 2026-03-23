/**
 * Trang chi tiết lệnh trong tab Phân tích chuyên sâu.
 * Hiển thị đúng các trường và giá trị từ API trả về — không cố định đề mục, không tính toán lại.
 * Bỏ qua _id và order_id (đã là title).
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { getNotificationsByDevice } from '@/services/taskRecord';

const SKIP_KEYS = new Set(['_id', 'order_id', 'updated_at', 'device_num', 'area_id', 'route_id', 'group_id', 'from_to']);

/** Bản dịch cấp độ cảnh báo */
const GRADE_LABEL = { 1: 'Thấp', 2: 'Trung bình', 3: 'Cao', 4: 'Nghiêm trọng' };

/**
 * Kiểm tra xem alarm_date của notification có rơi vào khoảng thời gian của bất kỳ waitSpot nào không.
 * waitSpots: [{ posKey, duration, startTime, endTime }]
 */
function isInWaitSpot(notification, waitSpots) {
  if (!notification?.alarm_date || !waitSpots?.length) return false;
  const t = new Date(notification.alarm_date).getTime();
  if (isNaN(t)) return false;
  return waitSpots.some(({ startTime, endTime }) => {
    const s = new Date(startTime).getTime();
    const e = new Date(endTime).getTime();
    return !isNaN(s) && !isNaN(e) && t >= s && t <= e;
  });
}

export default function DeepAnalysisOrderDetail({ data, onBack, loading, robotMeta, waitSpots = [] }) {
  const { t } = useTranslation();
  const fields = data ? Object.keys(data).filter((k) => !SKIP_KEYS.has(k)) : [];

  // Fetch notifications theo robotMeta khi có
  const [notifications, setNotifications] = useState([]);
  const [notiLoading, setNotiLoading] = useState(false);

  useEffect(() => {
    if (!robotMeta?.deviceName) {
      setNotifications([]);
      return;
    }
    let cancelled = false;
    setNotiLoading(true);
    getNotificationsByDevice(robotMeta.deviceName, robotMeta.startDate, robotMeta.endDate)
      .then((list) => { if (!cancelled) setNotifications(list ?? []); })
      .catch(() => { if (!cancelled) setNotifications([]); })
      .finally(() => { if (!cancelled) setNotiLoading(false); });
    return () => { cancelled = true; };
  }, [robotMeta]);

  return (
    <div className="flex flex-col w-full h-full min-h-0">
      {/* Card glass bao trùm: nút quay lại + title + nội dung */}
      <div className="glass rounded-lg border border-white/10 flex flex-col overflow-hidden p-4 sm:p-5 lg:p-6 flex-1 min-h-0">

        {/* Header: nút quay lại + title = order_id + from_to */}
        <div className="flex items-center gap-3 mb-5 flex-shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col min-w-0">
            <h2
              className="text-lg sm:text-xl lg:text-2xl font-semibold text-white truncate"
              title={data?.order_id}
            >
              {data?.order_id ?? '—'}
            </h2>
            {data?.from_to && (
              <span className="text-xs sm:text-sm text-gray-400 truncate" title={data.from_to}>
                {data.from_to}
              </span>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[rgb(34,189,189)] border-t-transparent" />
          </div>
        )}

        {/* Nội dung chi tiết — đúng theo data API */}
        {!loading && data && (
          <div className="flex flex-col gap-3 overflow-auto">
            {/* ── Bảng duration ── */}
            {fields.map((key) => {
              const isTotal = key === 'total_duration';
              const label = t(`taskDetail.${key.trim()}`, { defaultValue: key.trim() });
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                    isTotal
                      ? 'bg-[rgb(34,189,189)]/15 border border-[rgb(34,189,189)]/40'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <span className={`text-sm sm:text-base lg:text-lg font-medium ${isTotal ? 'text-[rgb(34,189,189)]' : 'text-gray-300'}`}>
                    {label}
                  </span>
                  <span className={`text-sm sm:text-base lg:text-lg font-semibold tabular-nums ${isTotal ? 'text-[rgb(34,189,189)]' : 'text-white'}`}>
                    {String(data[key] ?? '—')}
                  </span>
                </div>
              );
            })}

            {/* ── Vị trí cảnh báo ── */}
            {(notiLoading || notifications.length > 0 || robotMeta?.deviceName) && (
              <div className="mt-4 flex flex-col gap-2">
                {/* Tiêu đề section */}
                <div className="flex items-center gap-2 pb-1 border-b border-white/10">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span className="text-sm sm:text-base font-semibold text-yellow-400">
                    Thông báo
                  </span>
                  {!notiLoading && (
                    <span className="ml-auto text-xs text-gray-400">
                      {notifications.length} cảnh báo
                      {waitSpots.length > 0 && notifications.filter(n => isInWaitSpot(n, waitSpots)).length > 0 && (
                        <span className="ml-2 text-orange-400 font-semibold">
                          · {notifications.filter(n => isInWaitSpot(n, waitSpots)).length} trong lúc chờ
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* Loading spinner */}
                {notiLoading && (
                  <div className="flex items-center gap-2 py-3 text-gray-400 text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent" />
                    Đang tải cảnh báo...
                  </div>
                )}

                {/* Không có cảnh báo */}
                {!notiLoading && notifications.length === 0 && (
                  <p className="text-xs text-gray-500 py-2 text-center">Không có cảnh báo trong khoảng thời gian này</p>
                )}

                {/* Danh sách cảnh báo */}
                {!notiLoading && notifications.map((n, idx) => {
                  const highlighted = isInWaitSpot(n, waitSpots);
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col gap-1.5 px-4 py-3 rounded-lg border transition-colors ${
                        highlighted
                          ? 'bg-orange-500/15 border-orange-400/60 shadow-[0_0_12px_rgba(251,146,60,0.25)]'
                          : 'bg-yellow-400/5 border-yellow-400/20'
                      }`}
                    >
                      {/* Dòng 1: alarm_code — to nhất */}
                      {n.alarm_code != null && (
                        <span className={`text-xl sm:text-2xl font-bold tracking-wide ${highlighted ? 'text-orange-300' : 'text-yellow-300'}`}>
                          {n.alarm_code}
                        </span>
                      )}
                      {/* Dòng 2: alarm_source + cấp độ */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm sm:text-base font-medium truncate ${highlighted ? 'text-orange-200/90' : 'text-yellow-200/80'}`}>
                          {n.alarm_source ?? '—'}
                        </span>
                        {n.alarm_grade != null && (
                          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                            highlighted
                              ? 'bg-orange-400/20 text-orange-300'
                              : 'bg-yellow-400/15 text-yellow-300'
                          }`}>
                            {GRADE_LABEL[n.alarm_grade] ?? `Cấp ${n.alarm_grade}`}
                          </span>
                        )}
                      </div>
                      {/* Dòng 3: thời gian */}
                      {n.alarm_date && (
                        <span className="text-xs text-gray-400">
                          {new Date(n.alarm_date).toLocaleString('vi-VN')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
