import { useState, useEffect, useCallback } from "react";
import { getRobotTableData, formatRobotTableData } from "@/services/Dashboard/robotTable";

/**
 * Hook để lấy danh sách robot cho RobotTable
 * @param {Object} options - Các tùy chọn
 * @param {Object} options.filters - Các filter (status, search, page, limit)
 * @returns {Object} Dữ liệu và trạng thái
 */
export function useRobotTable({ filters = {} } = {}) {
  const [robots, setRobots] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getRobotTableData(filters);
      const formattedData = formatRobotTableData(response);
      setRobots(formattedData.robots);
      setTotal(formattedData.total);
    } catch (err) {
      console.error("[useRobotTable] Error fetching data:", err);
      setError(err.message || "Lỗi khi tải danh sách robot");
      setRobots([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    robots,
    total,
    loading,
    error,
    refetch: fetchData,
  };
}

