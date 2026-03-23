import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import SemiPieChart from "./SemiPieChart";
import { useStatisticsLeftSide } from "@/hooks/Dashboard";

/**
 * Component chứa 2 SemiPieChart: 7 ngày và 30 ngày
 * Lấy data một lần từ hook và chia cho cả 2 chart
 * @param {Object} props
 * @param {'standalone'|'embedded'} props.variant - embedded: bỏ wrapper card riêng (dùng khi gộp trong StatisticsOverviewCard)
 */
export default function SemiPieChartGroup({ variant = "standalone" }) {
  const { t } = useTranslation();
  const { data } = useStatisticsLeftSide();

  // Helper function để format chart data (dùng label đã dịch)
  const formatChartData = (completed, total) => {
    const incomplete = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      percentage,
      chartData: [
        { name: t("statistics.semiPieCompleted"), value: completed, color: "#3cb170" },
        { name: t("statistics.semiPieIncomplete"), value: incomplete, color: "#a5b2bd" },
      ],
    };
  };

  // Format data cho week (7 ngày)
  const weekData = useMemo(() => {
    if (!data) return null;
    return formatChartData(
      data.completed_tasks_by_week || 0,
      data.total_tasks_by_week || 0
    );
  }, [data, t]);

  // Format data cho month (30 ngày)
  const monthData = useMemo(() => {
    if (!data) return null;
    return formatChartData(
      data.completed_tasks_by_month || 0,
      data.total_tasks_by_month || 0
    );
  }, [data, t]);

  const isEmbedded = variant === "embedded";

  return (
    <div className={`grid grid-cols-2 gap-2 laptop13:gap-1.5 fullhd:gap-2 tv:gap-8 min-h-0 flex-1 mt-6 laptop13:mt-2 fullhd:mt-3 tv:mt-4`}>
      <div className={`min-h-0 flex flex-col ${isEmbedded ? "w-full" : "card-purple-specific w-full"}`}>
        <span className="text-white font-medium mb-0 text-sm lg:text-base xl:text-base laptop13:text-xl fullhd:text-xl tv:text-5xl shrink-0">{t("statistics.last7Days")}</span>
        <div className="flex-1 min-h-0">
          <SemiPieChart data={weekData} />
        </div>
      </div>

      <div className={`min-h-0 flex flex-col ${isEmbedded ? "w-full" : "card-purple-specific"}`}>
        <span className="text-white font-medium mb-0 text-sm lg:text-base xl:text-base laptop13:text-xl fullhd:text-xl tv:text-5xl shrink-0">{t("statistics.last30Days")}</span>
        <div className="flex-1 min-h-0">
          <SemiPieChart data={monthData} />
        </div>
      </div>
    </div>
  );
}

