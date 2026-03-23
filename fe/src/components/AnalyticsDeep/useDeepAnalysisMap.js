/**
 * Hook chuyên dùng cho tab Phân tích chuyên sâu.
 * Gọi API lấy map theo area_id, không phụ thuộc vào component Bản đồ kho.
 * @param {number|string|null} areaId - ID khu vực (từ AreaContext)
 * @returns {{ mapData: object|null, loading: boolean, error: string|null, refetch: function }}
 */
import { useState, useEffect, useCallback } from 'react';
import { getMapFromBackend } from '@/services/mapService';

export function useDeepAnalysisMap(areaId) {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMap = useCallback(async () => {
    if (areaId == null || areaId === '') {
      setMapData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getMapFromBackend(areaId);
      if (result?.success && result?.data) {
        setMapData(result.data);
      } else {
        throw new Error(result?.message || 'Không có dữ liệu map');
      }
    } catch (err) {
      const message = err?.message || 'Lỗi khi tải bản đồ';
      setError(message);
      setMapData(null);
    } finally {
      setLoading(false);
    }
  }, [areaId]);

  useEffect(() => {
    fetchMap();
  }, [fetchMap]);

  return { mapData, loading, error, refetch: fetchMap };
}
