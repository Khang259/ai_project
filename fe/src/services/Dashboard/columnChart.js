import api from "../api";

/**
 * Lấy dữ liệu biểu đồ cột cho ColumnChart
 * @param {string} startDate - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} endDate - Ngày kết thúc (YYYY-MM-DD)
 * @returns {Promise} Dữ liệu biểu đồ cột
 */
export const getColumnChartData = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    params.set("start_date", startDate);
    params.set("end_date", endDate);

    const response = await api.get(`/dashboard/column-chart?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("[columnChart.getColumnChartData] Request failed", error);
    throw error;
  }
};

/**
 * Format dữ liệu cho ColumnChart
 * @param {Object} apiResponse - Response từ API
 * @returns {Array} Dữ liệu đã format
 */
export const formatColumnChartData = (apiResponse) => {
  if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
    return [];
  }

  return apiResponse.data.map((item) => ({
    thang: item.month || item.thang || "",
    Group_AE: item.group_ae || item.Group_AE || 0,
    Group_DCC: item.group_dcc || item.Group_DCC || 0,
    Group_MS2: item.group_ms2 || item.Group_MS2 || 0,
  }));
};

