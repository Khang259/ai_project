import { useState, useEffect } from 'react';
import { getCamerasByArea } from '@/services/camera-settings';

/**
 * Custom hook for fetching and managing camera data
 * @param {string} currAreaId - Current area ID
 * @returns {Object} - Camera data and status
 */
export const useCameraData = (currAreaId) => {
  const [camerasData, setCamerasData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCamerasData = async () => {
      if (!currAreaId) {
        console.log('⚠️ No currentAreaId provided, skipping camera fetch');
        setCamerasData([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const cameras = await getCamerasByArea(currAreaId);
        setCamerasData(cameras || []);
      } catch (err) {
        console.error('❌ Error fetching cameras data:', err);
        setError(err);
        setCamerasData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCamerasData();
  }, [currAreaId]); // Re-fetch when area changes

  return {
    camerasData,
    loading,
    error,
  };
};
