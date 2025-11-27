import api from "../api";

/**
 * Lấy danh sách robot cho RobotTable
 * @param {Object} filters - Các filter tùy chọn
 * @returns {Promise} Danh sách robot
 */
export const getRobotTableData = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.status) {
      params.set("status", filters.status);
    }
    if (filters.search) {
      params.set("search", filters.search);
    }
    if (filters.page) {
      params.set("page", filters.page.toString());
    }
    if (filters.limit) {
      params.set("limit", filters.limit.toString());
    }

    const response = await api.get(`/dashboard/robot-table?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("[robotTable.getRobotTableData] Request failed", error);
    throw error;
  }
};

/**
 * Format dữ liệu cho RobotTable
 * @param {Object} apiResponse - Response từ API
 * @returns {Object} Dữ liệu đã format
 */
export const formatRobotTableData = (apiResponse) => {
  if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
    return {
      robots: [],
      total: 0,
    };
  }

  return {
    robots: apiResponse.data.map((item) => ({
      id: item.id || item.robot_id || "",
      name: item.name || item.robot_name || "",
      status: item.status || "unknown",
      battery: item.battery || item.battery_level || 0,
    })),
    total: apiResponse.total || apiResponse.data.length,
  };
};

