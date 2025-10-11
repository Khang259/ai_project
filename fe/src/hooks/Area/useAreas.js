// src/hooks/Area/useAreas.js
import { useState, useEffect, useMemo } from 'react';
import { getAllAreas } from '@/services/mapService';
import api from '@/services/api';

export const useAreas = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');

  // Fetch areas from API
  const fetchAreas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[useAreas] Fetching areas from API...');
      const areasData = await getAllAreas();
      
      console.log('[useAreas] ✅ Areas fetched successfully:', areasData);
      setAreas(areasData);
    } catch (error) {
      console.error('[useAreas] ❌ Error fetching areas:', error);
      setError(error.message);
      
      // Fallback to mock data
      const mockAreas = [
        {
          id: "mock1",
          area_id: 1,
          area_name: "Honda_HN",
          created_by: "admin",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: "mock2", 
          area_id: 2,
          area_name: "MS2",
          created_by: "admin",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setAreas(mockAreas);
      console.log('[useAreas] ⚠️ Using mock data as fallback');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAreas();
  }, []);

  // Filter areas based on search and area filter
  const filteredAreas = useMemo(() => {
    let filtered = areas;

    // Apply search filter
    if (search.trim()) {
      filtered = filtered.filter(area =>
        area.area_name.toLowerCase().includes(search.toLowerCase()) ||
        area.area_id.toString().includes(search) ||
        area.created_by.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply area filter
    if (areaFilter !== 'all') {
      filtered = filtered.filter(area => area.area_name === areaFilter);
    }

    return filtered;
  }, [areas, search, areaFilter]);

  // Add new area
  const handleAddArea = async (areaData) => {
    try {
      console.log('[useAreas] Adding new area:', areaData);
      
      const response = await api.post('/areas', areaData);
      
      if (response.data) {
        const newArea = response.data;
        setAreas(prev => [...prev, newArea]);
        console.log('[useAreas] ✅ Area added successfully:', newArea);
      }
    } catch (error) {
      console.error('[useAreas] ❌ Error adding area:', error);
      throw error;
    }
  };

  // Update area
  const handleUpdateArea = async (areaId, areaData) => {
    try {
      console.log('[useAreas] Updating area:', areaId, areaData);
      
      const response = await api.put(`/areas/${areaId}`, areaData);
      
      if (response.data) {
        const updatedArea = response.data;
        setAreas(prev => prev.map(area => 
          area.area_id === areaId ? updatedArea : area
        ));
        console.log('[useAreas] ✅ Area updated successfully:', updatedArea);
      }
    } catch (error) {
      console.error('[useAreas] ❌ Error updating area:', error);
      throw error;
    }
  };

  // Delete area
  const handleDelete = async (areaId) => {
    try {
      console.log('[useAreas] Deleting area:', areaId);
      
      await api.delete(`/areas/${areaId}`);
      
      setAreas(prev => prev.filter(area => area.area_id !== areaId));
      console.log('[useAreas] ✅ Area deleted successfully');
    } catch (error) {
      console.error('[useAreas] ❌ Error deleting area:', error);
      throw error;
    }
  };

  // Refetch areas
  const refetchAreas = () => {
    fetchAreas();
  };

  return {
    areas,
    filteredAreas,
    loading,
    error,
    search,
    setSearch,
    areaFilter,
    setAreaFilter,
    handleAddArea,
    handleUpdateArea,
    handleDelete,
    refetchAreas,
  };
};
