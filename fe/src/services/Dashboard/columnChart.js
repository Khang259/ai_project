import api from "../api";
// import { getGroupId } from "@/utils/get_groupidUtils";

/**
 * Lấy dữ liệu biểu đồ cột cho ColumnChart từ endpoint success-task-by-hour
 * @param {number|null} areaId - ID khu vực (hook lấy từ AreaContext rồi truyền vào)
 * @returns {Promise} Dữ liệu biểu đồ cột
 */
export const getColumnChartData = async (areaId = null, groupId = null) => {
  try {
    const params = new URLSearchParams();
    if (areaId != null) {
      params.set("area_id", areaId.toString());
    }
    if (groupId != null) {
      params.set("group_id", String(groupId));
    }
    const url = `/success-task-by-hour${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("[columnChart.getColumnChartData] Request failed", error);
    throw error;
  }
};

/** Key duy nhất cho 1 cột: tỷ lệ hoàn thành / tổng (%) */
export const COLUMN_CHART_VALUE_KEY = "Tỷ lệ hoàn thành / tổng";

/**
 * Format cho ColumnChart: 1 cột theo giờ = số hoàn thành / tổng (completed / (completed + failed)), trả về % 0–100.
 * Return: [{ gio, "Tỷ lệ hoàn thành / tổng": number }, ...]
 */
export const formatColumnChartData = (apiResponse) => {
  if (!apiResponse?.data || typeof apiResponse.data !== "object") {
    return [];
  }

  const dataObj = apiResponse.data;
  const failedObj = apiResponse.failed_data && typeof apiResponse.failed_data === "object" ? apiResponse.failed_data : {};

  const areaId =
    apiResponse.filtered_by_area_id != null
      ? String(apiResponse.filtered_by_area_id)
      : Object.keys(dataObj)[0] || Object.keys(failedObj)[0];

  const successByHour = areaId && dataObj[areaId] ? dataObj[areaId] : {};
  const failedByHour = areaId && failedObj[areaId] ? failedObj[areaId] : {};

  const allHours = new Set([
    ...Object.keys(successByHour).map(Number).filter((h) => !Number.isNaN(h)),
    ...Object.keys(failedByHour).map(Number).filter((h) => !Number.isNaN(h)),
  ]);
  const sortedHours = [...allHours].sort((a, b) => a - b);

  if (sortedHours.length === 0) {
    return [];
  }

  return sortedHours.map((hour) => {
    const completed = Number(successByHour[hour]) || 0;
    const failed = Number(failedByHour[hour]) || 0;
    const total = completed + failed;
    const ratioPct = total > 0 ? (completed / total) * 100 : 0;
    return {
      gio: `${String(hour).padStart(2, "0")}:00`,
      [COLUMN_CHART_VALUE_KEY]: Math.round(ratioPct * 100) / 100,
    };
  });
};

