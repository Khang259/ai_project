import api from "../api";
import { getGroupId } from "@/utils/get_groupidUtils";

/**
 * Lấy dữ liệu biểu đồ cột cho ColumnChart từ endpoint success-task-by-hour
 * @returns {Promise} Dữ liệu biểu đồ cột
 */
export const getColumnChartData = async () => {
  try {
    const groupId = getGroupId();
    const params = new URLSearchParams();
    
    if (groupId !== null && groupId !== undefined) {
      params.set("group_id", groupId.toString());
    }
    
    const url = `/success-task-by-hour${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get(url);
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
  if (!apiResponse?.data || typeof apiResponse.data !== 'object') {
    return [];
  }

  const groupsData = apiResponse.data;
  
  // Lấy tất cả các giờ có thể có (từ tất cả các group)
  const allHours = new Set();
  Object.values(groupsData).forEach(hourData => {
    Object.keys(hourData).forEach(hour => allHours.add(hour));
  });
  
  // Sắp xếp các giờ
  const sortedHours = Array.from(allHours).sort((a, b) => Number(a) - Number(b));
  
  // Tạo mảng kết quả
  const result = sortedHours.map(hour => {
    const item = { gio: `${hour}h` };
    
    // Duyệt qua từng group và thêm dữ liệu
    Object.entries(groupsData).forEach(([groupId, hourData]) => {
      // Mapping group_id thành tên group
      const groupKey = groupId === "1" ? "Group_AE" : 
                       groupId === "2" ? "Group_DCC" : 
                       groupId === "3" ? "Group_KD" :
                       groupId === "4" ? "Group_MS" :
                       `Group_${groupId}`;
      
      item[groupKey] = Math.round(hourData[hour] || 0);
    });
    
    return item;
  });
  
  return result;
};

