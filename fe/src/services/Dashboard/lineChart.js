import api from "../api";
// import { getGroupId } from "@/utils/get_groupidUtils";

/**
 * Lấy dữ liệu biểu đồ cột cho ColumnChart từ endpoint success-task-by-hour
 * @param {number|null} areaId - ID khu vực (hook lấy từ AreaContext rồi truyền vào)
 * @returns {Promise} Dữ liệu biểu đồ cột
 */
export const getLineChartData = async (areaId = null, groupId = null) => {
  try {
    const params = new URLSearchParams();
    if (areaId != null) {
      params.set("area_id", areaId.toString());
    }
    if (groupId != null) {
      params.set("group_id", String(groupId));
    }
    const url = `/efficiency-payload-hour${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("[lineChart.getLineChartData] Request failed", error);
    throw error;
  }
};

/**
 * Format dữ liệu cho ColumnChart
 * @param {Object} apiResponse - Response từ API
 * @returns {Array} Dữ liệu đã format
 */
export const formatLineChartData = (apiResponse) => {
  // Kiểm tra hourly_data thay vì data
  if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
    console.error("Data structure mismatch. Expected hourly_data array.");
    return [];
  }

  return apiResponse.data.map((item) => {
    const timeStr = item.time_slot 
      ? new Date(item.time_slot).toLocaleTimeString('vi-VN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
      : "";

      const loadedValue = Number(item.loaded_count) || 0;
      const unloadedValue = Number(item.unloaded_count) || 0;
      const totalValue = loadedValue + unloadedValue;
    
      // Tính toán % cho từng trạng thái
      const intaskPercent = (loadedValue / totalValue) * 100;
      const idlePercent = (unloadedValue / totalValue) * 100;

    return {
      gio: timeStr,
      // Dùng utilization làm giá trị hiển thị vì nó là % (giống biểu đồ cũ của bạn)
      // Hoặc dùng idle/intask tùy nhu cầu
      "Có tải": parseFloat(intaskPercent.toFixed(2)), // Làm tròn 2 chữ số thập phân
      "Không tải": parseFloat(idlePercent.toFixed(2)), // Làm tròn 2 chữ số thập phân
    };
  });
};



