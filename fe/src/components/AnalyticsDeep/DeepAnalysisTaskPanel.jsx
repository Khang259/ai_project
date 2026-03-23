/**
 * Panel danh sách lệnh thời gian dài cho tab Phân tích chuyên sâu.
 * - Gọi /task-details/long-duration (threshold=0) để lấy toàn bộ task_details theo area_id.
 * - Hiển thị: mã đơn hàng + tổng thời gian thực hiện.
 * - Tìm kiếm client-side theo order_id, phân trang 5 dòng/trang.
 * - Double-click → fetch robot path, vẽ lên bản đồ.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useArea } from '@/contexts/AreaContext';
import { getTaskDetailByOrderId, getRobotPathByOrderId, getTaskDetailsLongDuration, getNotificationsByDevice } from '@/services/taskRecord';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import TablePagination from '@/components/Notification/TablePagination';
import DeepAnalysisOrderDetail from './DeepAnalysisOrderDetail';

const PAGE_SIZE = 5;

/** Format giây → "Xp Yg" hoặc chỉ "Xs" nếu dưới 1 phút */
function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return '—';
  const s = Math.round(Number(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}p ${rem}s` : `${m}p`;
}

export default function DeepAnalysisTaskPanel({ onRobotPath, onWaitSpots, onTaskPoints }) {
  const { currAreaId } = useArea();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Chi tiết lệnh khi double-click
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [robotMeta, setRobotMeta] = useState(null);
  // waitSpots lưu local để truyền xuống OrderDetail kiểm tra thông báo
  const [localWaitSpots, setLocalWaitSpots] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSearch('');
    setCurrentPage(1);
    try {
      const result = await getTaskDetailsLongDuration({
        threshold: 200,
        page: 1,
        limit: 100,
        area_id: currAreaId || undefined,
      });
      setData(result.data || []);
    } catch (err) {
      console.error('[DeepAnalysisTaskPanel]', err);
      setError(err?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [currAreaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) => (item.order_id ?? '').toLowerCase().includes(q));
  }, [data, search]);

  const totalPages = useMemo(() => Math.ceil(filtered.length / PAGE_SIZE) || 1, [filtered.length]);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleRowDoubleClick = useCallback(async (orderId) => {
    if (!orderId) return;
    setDetailLoading(true);
    setDetailData({ order_id: orderId });
    setRobotMeta(null);
    onRobotPath?.([]);
    onWaitSpots?.([]);
    onTaskPoints?.([]);
    try {
      const [doc, robotResult] = await Promise.all([
        getTaskDetailByOrderId(orderId),
        getRobotPathByOrderId(orderId).catch(() => ({ positions: [], waitSpots: [], deviceName: null, startDate: null, endDate: null })),
      ]);
      setDetailData(doc ?? { order_id: orderId });
      onRobotPath?.(robotResult.positions ?? []);
      onTaskPoints?.(robotResult.taskPoints ?? []);

      // Enrich waitSpots với alarm_codes: fetch notifications rồi gắn vào từng spot
      let spots = robotResult.waitSpots ?? [];
      if (spots.length > 0 && robotResult.deviceName) {
        try {
          const notifs = await getNotificationsByDevice(
            robotResult.deviceName,
            robotResult.startDate,
            robotResult.endDate,
          );
          spots = spots.map((spot) => {
            const s = new Date(spot.startTime).getTime();
            const e = new Date(spot.endTime).getTime();
            const alarmCodes = notifs
              .filter((n) => {
                if (!n.alarm_date) return false;
                const t = new Date(n.alarm_date).getTime();
                return !isNaN(t) && t >= s && t <= e;
              })
              .map((n) => n.alarm_code ?? n.alarm_source)
              .filter(Boolean);
            return { ...spot, alarmCodes };
          });
        } catch {
          // không enrich nếu lỗi, vẫn hiển thị chấm vàng bình thường
        }
      }
      onWaitSpots?.(spots);
      setLocalWaitSpots(spots);

      if (robotResult.deviceName) {
        setRobotMeta({
          deviceName: robotResult.deviceName,
          startDate:  robotResult.startDate,
          endDate:    robotResult.endDate,
        });
      }
    } catch (err) {
      console.error('[DeepAnalysisTaskPanel] detail fetch error', err);
      setDetailData({ order_id: orderId });
    } finally {
      setDetailLoading(false);
    }
  }, [onRobotPath, onWaitSpots]);

  const handleBackToList = useCallback(() => {
    setDetailData(null);
    setDetailLoading(false);
    setRobotMeta(null);
    setLocalWaitSpots([]);
    onRobotPath?.([]);
    onWaitSpots?.([]);
    onTaskPoints?.([]);
  }, [onRobotPath, onWaitSpots, onTaskPoints]);

  const thClass = 'font-semibold text-white py-3 px-3 lg:py-4 lg:px-4 text-base lg:text-lg';
  const tdClass = 'text-white py-3 px-3 lg:py-4 lg:px-4 text-base lg:text-lg';

  if (detailData !== null) {
    return (
      <DeepAnalysisOrderDetail
        data={detailData}
        loading={detailLoading}
        onBack={handleBackToList}
        robotMeta={robotMeta}
        waitSpots={localWaitSpots}
      />
    );
  }

  return (
    <div className="flex flex-col w-full h-full min-h-0">
      <div className="glass rounded-lg border border-white/10 text-white flex flex-col overflow-hidden p-4 sm:p-5 lg:p-6 flex-1 min-h-0">

        {/* Header */}
        <div className="flex flex-col gap-2 mb-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl lg:text-2xl font-semibold text-white">Lệnh thời gian dài</h2>
            {data.length > 0 && (
              <span className="text-xs text-gray-400">{filtered.length} lệnh</span>
            )}
          </div>

          {/* Thanh tìm kiếm */}
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = search.trim();
                  if (val) handleRowDoubleClick(val);
                }
              }}
              placeholder="Tìm mã đơn hàng — Enter để xem chi tiết"
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-sm lg:text-base text-white placeholder-gray-400 focus:outline-none focus:border-[rgb(34,189,189)] focus:ring-1 focus:ring-[rgb(34,189,189)] transition-colors"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="p-4 space-y-3 flex-1">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Lỗi */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center flex-1 text-center px-4 gap-3">
            <p className="text-red-400 text-lg">Không thể tải dữ liệu</p>
            <Button onClick={fetchData} variant="outline">Thử lại</Button>
          </div>
        )}

        {/* Không có dữ liệu */}
        {!loading && !error && data.length === 0 && (
          <div className="flex items-center justify-center flex-1 text-gray-400 text-xl text-center px-4">
            Không có lệnh nào
          </div>
        )}

        {/* Bảng + phân trang */}
        {!loading && !error && data.length > 0 && (
          <>
            <div className="flex-1 overflow-auto px-2 sm:px-4 lg:px-6">
              <Table className="text-base lg:text-lg">
                <TableHeader>
                  <TableRow>
                    <TableHead className={thClass}>Mã đơn hàng</TableHead>
                    <TableHead className={`${thClass} text-right`}>Tổng thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((item, index) => (
                    <TableRow
                      key={`${item.order_id}-${index}`}
                      className="text-white hover:bg-white/5 cursor-pointer select-none"
                      onDoubleClick={() => handleRowDoubleClick(item.order_id)}
                      title="Double-click để xem chi tiết trên bản đồ"
                    >
                      <TableCell className={`${tdClass} max-w-[220px] lg:max-w-xs truncate`} title={item.order_id}>
                        {item.order_id ?? '—'}
                      </TableCell>
                      <TableCell className={`${tdClass} text-right font-mono text-[rgb(34,189,189)]`}>
                        {formatDuration(item.total_duration)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex-shrink-0 border-t border-white/10 px-2 py-1 mb-4">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                total={filtered.length}
                itemsPerPage={PAGE_SIZE}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
