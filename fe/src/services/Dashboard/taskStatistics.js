import api from "../api";
import { getGroupId } from "@/utils/get_groupidUtils";

/**
 * Lấy dữ liệu thống kê task chung cho StatisticsLeftSide và SemiPieChart
 * Endpoint: /task-dashboard
 * @returns {Promise} Dữ liệu thống kê
 */
export const getTaskStatistics = async () => {
  try {
    const groupId = getGroupId();
    const params = new URLSearchParams();
    
    // Chỉ thêm group_id vào params nếu không null
    if (groupId !== null && groupId !== undefined) {
      params.set("group_id", groupId.toString());
    }
    
    const url = `/task-dashboard${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("[taskStatistics.getTaskStatistics] Request failed", error);
    throw error;
  }
};

