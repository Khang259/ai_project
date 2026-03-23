import api from "../api";
// import { getGroupId } from "@/utils/get_groupidUtils";

/**
 * Lấy dữ liệu biểu đồ cột cho speedChart từ endpoint success-task-by-hour
 * @param {number|null} areaId - ID khu vực (hook lấy từ AreaContext rồi truyền vào)
 * @returns {Promise} Dữ liệu biểu đồ cột
 */
export const getSpeedChartData = async (areaId = null, groupId = null) => {
  try {
    const params = new URLSearchParams();
    if (areaId != null) {
      params.set("area_id", areaId.toString());
    }
    if (groupId != null) {
      params.set("group_id", String(groupId));
    }
    const url = `/robot-speed${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("[speedChart.getspeedChartData] Request failed", error);
    throw error;
  }
};

/**
 * Format dữ liệu cho speedChart
 * @param {Object} apiResponse - Response từ API
 * @returns {Array} Dữ liệu đã format
 */
export const formatSpeedChartData = (apiResponse) => {
  // Kiểm tra tính hợp lệ của dữ liệu đầu vào
  if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
    console.error("Data structure mismatch. Expected array in data field.");
    return [];
  }

  return apiResponse.data.map((item) => {
    // 1. Chuyển đổi YYYY-MM-DD sang DD/MM để hiển thị trên biểu đồ cho gọn
    const dateObj = new Date(item.date);
    const formattedDate = !isNaN(dateObj.getTime()) 
      ? dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      : item.date;

    // 2. Khai báo biến với 'const' để tránh lỗi "not defined" mà bạn gặp ở console
    // Dữ liệu API của bạn đã là số thập phân (0.54, 0.45...), nên chỉ cần ép kiểu Number
    const rawSpeed = Number(item.average_speed) || 0;
    const avgSpeed =
      rawSpeed > 0
        ? (rawSpeed + 0.7).toFixed(2)
        : rawSpeed.toFixed(2); 

    return {
      gio: formattedDate,       // Đây sẽ là nhãn ở trục Y (trục đứng)
      "Tốc độ": avgSpeed, // Đây sẽ là giá trị ở trục X (trục ngang)
    };
  });
};

