import api from "../api";

/**
 * Lấy dữ liệu thống kê task chung cho StatisticsLeftSide và SemiPieChart
 * Endpoint: /task-dashboard
 * @returns {Promise} Dữ liệu thống kê
 */
export const getTaskStatistics = async () => {
  try {
    const response = await api.get(`/task-dashboard`);
    return response.data;
  } catch (error) {
    console.error("[taskStatistics.getTaskStatistics] Request failed", error);
    throw error;
  }
};

/**
 * Format dữ liệu cho StatisticsLeftSide
 * Sử dụng: completed_tasks, in_progress_tasks, failed_tasks, cancelled_tasks
 * @param {Object} apiResponse - Response từ API
 * @returns {Object} Dữ liệu đã format
 */
export const formatStatisticsLeftSide = (apiResponse) => {
  if (!apiResponse) {
    return {
      totalTasks: 0,
      completed: 0,
      inProgress: 0,
      failed: 0,
      cancelled: 0,
      chartData: {
        labels: [],
        datasets: [
          {
            data: [],
          },
        ],
      },
    };
  }

  const completed = apiResponse.completed_tasks || 0;
  const inProgress = apiResponse.in_progress_tasks || 0;
  const failed = apiResponse.failed_tasks || 0;
  const cancelled = apiResponse.cancelled_tasks || 0;
  const totalTasks = completed + inProgress + failed + cancelled;

  return {
    totalTasks,
    completed,
    inProgress,
    failed,
    cancelled,
    chartData: {
      labels: ["Hoàn thành", "Đang thực hiện", "Thất bại", "Hủy bỏ"],
      datasets: [
        {
          data: [completed, inProgress, failed, cancelled],
        },
      ],
    },
  };
};

/**
 * Format dữ liệu cho SemiPieChart (week hoặc month)
 * Sử dụng: completed_tasks_by_week/month, total_tasks_by_week/month
 * @param {Object} apiResponse - Response từ API
 * @param {string} period - "week" hoặc "month"
 * @returns {Object} Dữ liệu đã format
 */
export const formatSemiPieChartData = (apiResponse, period) => {
  if (!apiResponse) {
    return {
      completed: 0,
      incomplete: 0,
      percentage: 0,
      chartData: [
        { name: "Hoàn thành", value: 0, color: "#3cb170" },
        { name: "Chưa hoàn thành", value: 0, color: "#a5b2bd" },
      ],
    };
  }

  const isWeek = period === "week";
  const completed = isWeek 
    ? (apiResponse.completed_tasks_by_week || 0)
    : (apiResponse.completed_tasks_by_month || 0);
  const total = isWeek
    ? (apiResponse.total_tasks_by_week || 0)
    : (apiResponse.total_tasks_by_month || 0);
  const incomplete = total - completed;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    completed,
    incomplete,
    percentage,
    chartData: [
      { name: "Hoàn thành", value: completed, color: "#3cb170" },
      { name: "Chưa hoàn thành", value: incomplete, color: "#a5b2bd" },
    ],
  };
};

