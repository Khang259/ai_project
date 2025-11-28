import api from "../api";
import { getGroupId } from "@/utils/get_groupidUtils";

/**
 * Lấy dữ liệu biểu đồ đường cho LineChart từ endpoint battery-agv
 * @returns {Promise} Dữ liệu biểu đồ đường
 */
export const getLineChartData = async () => {
  try {
    const groupId = getGroupId();
    const params = new URLSearchParams();
    
    if (groupId !== null && groupId !== undefined) {
      params.set("group_id", groupId.toString());
    }
    
    const url = `/battery-agv${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get(url);
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

  const timeMap = new Map();
  
  apiResponse.data.forEach((item) => {
    const snapshotTime = item.snapshot_time;
    const groupId = item.group_id?.toString() || "";
    const avgBattery = item.avg_battery || 0;
    
    // Format thời gian (giờ:phút)
    const timeStr = snapshotTime 
      ? new Date(snapshotTime).toLocaleTimeString('vi-VN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
      : "";
    
    if (!timeMap.has(timeStr)) {
      timeMap.set(timeStr, { thang: timeStr });
    }
    
    // Mapping group_id thành tên group
    const groupKey = groupId === "1" ? "Group_AE" : 
                     groupId === "2" ? "Group_DCC" : 
                     groupId === "3" ? "Group_KD" :
                     groupId === "4" ? "Group_MS" :
                     `Group_${groupId}`; // Fallback cho các group khác
    
    timeMap.get(timeStr)[groupKey] = Math.round(avgBattery);
  });
  
  // Chuyển thành array và sắp xếp theo thời gian
  const result = Array.from(timeMap.values()).sort((a, b) => {
    const timeA = a.thang.split(':').map(Number);
    const timeB = b.thang.split(':').map(Number);
    if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
    return timeA[1] - timeB[1];
  });
  
  return result;
};

