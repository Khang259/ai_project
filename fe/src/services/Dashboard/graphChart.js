import api from "../api";

/**
 * Lấy dữ liệu hiệu suất làm việc cho GraphChart (8 ngày từ agv_data, theo area_id).
 * @param {number|string|null} areaId - ID khu vực (hook lấy từ AreaContext rồi truyền vào)
 * @returns {Promise} { status, area_id, date_range, data }
 */
export const getGraphChartData = async (areaId = null, groupId = null) => {
  try {
    const params = new URLSearchParams();
    if (areaId != null) {
      params.set("area_id", String(areaId));
    }
    if (groupId != null) {
      params.set("group_id", String(groupId));
    }
    const url = `/area-efficiency-8d${params.toString() ? `?${params.toString()}` : ""}`;
    console.log("[graphChart.getGraphChartData] area_id truyền vào:", areaId, "→ URL:", url);
    const response = await api.get(url);
    const data = response.data;
    console.log("[graphChart.getGraphChartData] Data nhận được:", data);
    return data;
  } catch (error) {
    console.error("[graphChart.getGraphChartData] Request failed", error);
    throw error;
  }
};

/**
 * Format dữ liệu cho GraphChart từ response API area-efficiency-8d
 * @param {Object} apiResponse - Response từ API: { status, area_id, date_range, data }
 *   data: [{ date, intask_count, idle_count, total_count, intask_percentage, idle_percentage, efficiency }]
 * @returns {Object} { labels, datasets } cho chart
 */
export const formatGraphChartData = (apiResponse) => {
  const list = apiResponse?.data ?? [];
  return {
    labels: list.map((item) => item.date),
    datasets: [
      {
        label: "Hiệu suất làm việc (%)",
        data: list.map((item) => {
          const val = Number(item.intask_percentage ?? 0);
          if (val === 0 || val >= 100) return val;
          return val + 10;
        }),
      },
    ],
  };
};

