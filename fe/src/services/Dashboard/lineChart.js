import api from "../api";

/**
 * Lấy dữ liệu biểu đồ đường cho LineChart
 * @param {string} startDate - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} endDate - Ngày kết thúc (YYYY-MM-DD)
 * @returns {Promise} Dữ liệu biểu đồ đường
 */
export const getLineChartData = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    params.set("start_date", startDate);
    params.set("end_date", endDate);

    const response = await api.get(`/dashboard/line-chart?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("[lineChart.getLineChartData] Request failed", error);
    throw error;
  }
};

/**
 * Format dữ liệu cho LineChart
 * @param {Object} apiResponse - Response từ API
 * @returns {Array} Dữ liệu đã format
 */
export const formatLineChartData = (apiResponse) => {
  if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
    return [];
  }

  return apiResponse.data.map((item) => ({
    thang: item.month || item.thang || "",
    Group_AE: item.group_ae || item.Group_AE || 0,
    Group_DCC: item.group_dcc || item.Group_DCC || 0,
  }));
};

