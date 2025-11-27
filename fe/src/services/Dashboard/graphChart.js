import api from "../api";

/**
 * Lấy dữ liệu hiệu suất làm việc cho GraphChart
 * @param {string} startDate - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} endDate - Ngày kết thúc (YYYY-MM-DD)
 * @returns {Promise} Dữ liệu hiệu suất
 */
export const getGraphChartData = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    params.set("start_date", startDate);
    params.set("end_date", endDate);

    const response = await api.get(`/dashboard/graph-chart?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("[graphChart.getGraphChartData] Request failed", error);
    throw error;
  }
};

/**
 * Format dữ liệu cho GraphChart
 * @param {Object} apiResponse - Response từ API
 * @returns {Object} Dữ liệu đã format
 */
export const formatGraphChartData = (apiResponse) => {
  if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
    return {
      labels: [],
      datasets: [
        {
          label: "Hiệu suất làm việc (%)",
          data: [],
        },
      ],
    };
  }

  const data = apiResponse.data;
  return {
    labels: data.map((item) => item.period || item.label || ""),
    datasets: [
      {
        label: "Hiệu suất làm việc (%)",
        data: data.map((item) => item.performance || item.value || 0),
      },
    ],
  };
};

