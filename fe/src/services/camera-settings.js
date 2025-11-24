//fe/src/services/add_camera.js
import api from "./api";

export const addCamera = async (cameraData) => {
  try {
    const response = await api.post("/cameras", cameraData);
    console.log("[camera-settings] addCamera response:", response);
    return response.data;
  } catch (error) {
    console.error("Error adding camera:", error);
  }
};


export const updateCamera = async (cameraData) => {
  try {
    const response = await api.put(`/cameras/${cameraData.id}`, cameraData);
    return response.data;
  } catch (error) {
    console.error("Error updating camera:", error);
  }
};

export const deleteCamera = async (cameraId) => {
  try {
    const response = await api.delete(`/cameras/${cameraId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting camera:", error);
    throw new Error(error.message || "Lỗi khi xóa camera");
  }
};

export const getCamerasByArea = async (areaId) => {
  try {
    const response = await api.get(`/cameras/area/${areaId}/cameras`);
    return response.data;
  } catch (error) {
    console.error("Error getting cameras by area:", error);
    throw new Error(error.message || "Lỗi khi lấy camera theo khu vực");
  }
};
