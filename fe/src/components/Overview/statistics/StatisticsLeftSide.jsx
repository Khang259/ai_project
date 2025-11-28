import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useTranslation } from "react-i18next";
import { useRef, useMemo, useEffect } from "react";
import { useStatisticsLeftSide } from "@/hooks/Dashboard";

ChartJS.register(ArcElement, Tooltip, Legend);

// Gradient config (giữ nguyên đẹp như cũ)
const GRADIENT_STOPS = [
  { start: "#daf1ff", end: "#3cb170" }, // completed
  { start: "#facc15", end: "#f97316" }, // inProgress
  { start: "#ffa2a2", end: "#d21814" }, // failed
  { start: "#4f505b", end: "#a5b2bd" }, // cancelled
] ;

export default function StatisticsLeftSide() {
  const { t } = useTranslation();
  const chartRef = useRef(null);
  const { data, refetch } = useStatisticsLeftSide();

  // Tự động refetch mỗi 5 giây
  useEffect(() => {
    const intervalId = setInterval(() => {
      refetch();
    }, 5000); // 5 giây = 5000ms

    // Cleanup interval khi component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [refetch]);

  // Map từ API field sang tên ngắn gọn (cách 2)
  const stats = useMemo(() => ({
    completed: data?.completed_tasks || 0,
    inProgress: data?.in_progress_tasks || 0,
    failed: data?.failed_tasks || 0,
    cancelled: data?.cancelled_tasks || 0,
  }), [data]);

  const total = stats.completed + stats.inProgress + stats.failed + stats.cancelled;
  const dataValues = Object.values(stats);

  // TẠO GRADIENT CHỈ 1 LẦN KHI CẦN (responsive hoàn hảo)
  const backgroundGradients = useMemo(() => {
    const chart = chartRef.current;
    if (!chart?.chartArea) {
      return GRADIENT_STOPS.map((g) => g.start);
    }

    const { ctx, chartArea } = chart;
    const { left, right, top, bottom } = chartArea;

    return GRADIENT_STOPS.map(({ start, end }) => {
      const gradient = ctx.createLinearGradient(left, bottom, right, top);
      gradient.addColorStop(0, start);
      gradient.addColorStop(1, end);
      return gradient;
    });
  }, [total, chartRef.current?.chartArea?.width]); // tự động tính lại khi resize

  const chartData = {
    labels: [
      t("statistics.completed"),
      t("statistics.inProgress"),
      t("statistics.failed"),
      t("statistics.cancelled"),
    ],
    datasets: [
      {
        data: dataValues,
        backgroundColor: backgroundGradients,     
        borderColor: GRADIENT_STOPS.map((g) => g.end),
        borderWidth: 2,
        borderRadius: 10,
        spacing: 4,
      },
    ],
  };

  const options = {
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.85)",
        titleColor: "white",
        bodyColor: "white",
        cornerRadius: 8,
      },
    },
    animation: { animateRotate: true, animateScale: true },
    maintainAspectRatio: false,
    responsive: true,
  };

  return (
    <div className="w-full">
      <div className="flex flex-row items-center">
        {/* Biểu đồ */}
        <div className="w-2/3 flex justify-center">
          <div className="relative h-56">
            <Doughnut ref={chartRef} data={chartData} options={options} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-bold text-white drop-shadow-2xl">
                {total}
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="w-1/3 space-y-3 text-lg">
          {([
            { label: t("statistics.completed"), value: stats.completed },
            { label: t("statistics.inProgress"), value: stats.inProgress },
            { label: t("statistics.failed"), value: stats.failed },
            { label: t("statistics.cancelled"), value: stats.cancelled },
          ]).map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-sm"
                style={{ background: GRADIENT_STOPS[i].end }}
              />
              <span className="text-white font-medium">{item.label}</span>
              <span className="text-white/90 ml-auto font-semibold">
                {total > 0 ? Math.round((item.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}