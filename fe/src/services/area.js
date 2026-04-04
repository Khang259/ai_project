import api from "./api";

export const getAllAreas = async () => {
  try {
    const response = await api.get('/areas');
    return response.data;
  } catch (error) {
    console.error('[AreaService] ❌ Lỗi khi lấy danh sách areas:', error);
    throw new Error(error.message || 'Lỗi khi lấy danh sách areas');
  }
};

export const createArea = async (areaData) => {
    try {
        const response = await api.post('/areas', areaData);
        return response.data;
    } catch (error) {
        console.error('[AreaService] ❌ Lỗi khi tạo area:', error);
        throw new Error(error.message || 'Lỗi khi tạo area');
    }
};

export const updateArea = async (areaId, areaData) => {
    try {
        const response = await api.put(`/areas/${areaId}`, areaData);
        return response.data;
    } catch (error) {
        console.error('[AreaService] ❌ Lỗi khi cập nhật area:', error);
        throw new Error(error.message || 'Lỗi khi cập nhật area');
    }
};

export const deleteArea = async (areaId) => {
    try {
        const response = await api.delete(`/areas/${areaId}`);
        return response.data;
    } catch (error) {
        console.error('[AreaService] ❌ Lỗi khi xóa area:', error);
        throw new Error(error.message || 'Lỗi khi xóa area');
    }
};

