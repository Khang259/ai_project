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
  { start: "#93c5fd", end: "#2563eb" },
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
    not_start: data?.not_start_tasks || 0,
    failed: data?.failed_tasks || 0,
    cancelled: data?.cancelled_tasks || 0,
  }), [data]);

  const total = stats.completed + stats.inProgress + stats.not_start + stats.failed + stats.cancelled;
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
      t("statistics.not_start"),
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
        hoverOffset: 6,
        // Vòng rộng, vành dày: cutout giảm = vành dày hơn
        cutout: "60%",
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
    <div className="statistics-left-side w-full h-full flex flex-col min-h-0 overflow-hidden laptop13:-ml-2 fullhd:-ml-4 tv:-ml-22">
      {/* Chuẩn fullhd; laptop13 nhỏ hơn; tv to hơn (màn TV 3840px) */}
      <div className="statistics-left-side__grid flex-1 min-h-0 grid grid-cols-[2fr_1fr] laptop13:grid-cols-[auto_1fr] fullhd:grid-cols-[auto_1fr] tv:grid-cols-[auto_1fr] gap-1 lg:gap-2 xl:gap-2 laptop13:gap-25 fullhd:gap-25 tv:gap-20 items-center overflow-hidden min-w-0">
        {/* Cột 1: Donut — TV: biểu đồ và số giữa to hơn */}
        <div className="statistics-left-side__donut-col flex justify-center laptop13:justify-end fullhd:justify-end tv:justify-end items-center min-h-0 min-w-0 min-h-[100px] lg:min-h-[100px] max-h-[240px] lg:max-h-[155px] xl:min-h-[240px] xl:max-h-[300px] laptop13:min-h-0 laptop13:max-h-[140px] laptop13:max-w-[160px] laptop13:mr-0 laptop13:ml-20 fullhd:min-h-0 fullhd:max-h-[170px] fullhd:max-w-[180px] fullhd:mr-0 fullhd:ml-16 tv:min-h-0 tv:max-h-[640px] tv:max-w-[640px] tv:mr-0 tv:ml-24">
          <div className="relative w-full h-full min-h-[160px] lg:min-h-[10px] xl:min-h-[220px] laptop13:min-h-0 laptop13:max-h-[140px] fullhd:min-h-0 fullhd:max-h-[170px] tv:min-h-0 tv:max-h-[640px] max-h-full">
            <Doughnut ref={chartRef} data={chartData} options={options} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl lg:text-2xl xl:text-3xl laptop13:text-xl fullhd:text-xl tv:text-6xl font-bold text-white drop-shadow-2xl">
                {total}
              </span>
            </div>
          </div>
        </div>

        {/* Cột 2: Legend — TV: chữ và số to, chấm màu to */}
        <div className="statistics-left-side__legend-col flex flex-col justify-center laptop13:space-y-0.5 fullhd:space-y-1 tv:space-y-4 overflow-hidden min-w-0 w-full pr-0.5 lg:pr-1 text-xs lg:text-sm xl:text-base laptop13:text-xl fullhd:text-xl tv:text-4xl">
          {([
            { label: t("statistics.completed"), value: stats.completed },
            { label: t("statistics.inProgress"), value: stats.inProgress },
            { label: t("statistics.not_start"), value: stats.not_start },
            { label: t("statistics.failed"), value: stats.failed },
            { label: t("statistics.cancelled"), value: stats.cancelled },
          ]).map((item, i) => (
            <div
              key={i}
              className="statistics-left-side__legend-row grid grid-cols-[minmax(0,1fr)_auto] laptop13:gap-x-1 fullhd:gap-x-6 tv:gap-x-12 items-center w-full min-w-0"
            >
              <div className="statistics-left-side__label-group flex items-center gap-1.5 lg:gap-1 laptop13:gap-2 fullhd:gap-2 tv:gap-5 min-w-0">
                <div
                  className="w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5 laptop13:w-3 laptop13:h-3 fullhd:w-3.5 fullhd:h-3.5 tv:w-8 tv:h-8 rounded-sm shrink-0"
                  style={{ background: GRADIENT_STOPS[i].end }}
                />
                <span className="statistics-left-side__label text-white font-medium truncate min-w-0">
                  {item.label}
                </span>
              </div>
              <div className="statistics-left-side__value-cell flex justify-end shrink-0">
                <span className="statistics-left-side__value text-white/90 font-semibold laptop13:text-xl fullhd:text-xl tv:text-5xl">
                  {total > 0 ? item.value : 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}