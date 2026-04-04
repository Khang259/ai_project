import api from "../api";
// import { getGroupId } from "@/utils/get_groupidUtils";

/**
 * Lấy dữ liệu thống kê task chung cho StatisticsLeftSide và SemiPieChart
 * Endpoint: /task-dashboard
 * @param {number|null} areaId - ID khu vực (hook lấy từ AreaContext rồi truyền vào)
 * @returns {Promise} Dữ liệu thống kê
 */
export const getTaskStatistics = async (areaId = null, _groupId = null) => {
  try {
    const params = new URLSearchParams();
    const areaIdParam = areaId != null ? areaId.toString() : "0";
    params.set("area_id", areaIdParam);
    const url = `/task-dashboard?${params.toString()}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("[taskStatistics.getTaskStatistics] Request failed", error);
    throw error;
  }
};

