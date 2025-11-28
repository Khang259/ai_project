import api from "../api";
import { getGroupId } from "@/utils/get_groupidUtils";

/**
 * Lấy dữ liệu hiệu suất làm việc cho GraphChart
 * @returns {Promise} Dữ liệu hiệu suất
 */
export const getGraphChartData = async () => {
  try {
    const groupId = getGroupId();
    const params = new URLSearchParams();
    params.set("group_id", groupId);

    const response = await api.get(`/dashboard/graph-chart?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("[graphChart.getGraphChartData] Request failed", error);
    throw error;
  }
};

/**
 * Format dữ liệu cho GraphChart
 * @param {Array} apiResponse - Response từ API dạng array [{date, InTask_percentage}]
 * @returns {Object} Dữ liệu đã format
 */
export const formatGraphChartData = (apiResponse) => {
  return {
    labels: apiResponse.map((item) => item.date),
    datasets: [
      {
        label: "Hiệu suất làm việc (%)",
        data: apiResponse.map((item) => item.InTask_percentage),
      },
    ],
  };
};

