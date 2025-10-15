//fe/src/services/add_camera.js
import api from "./api";

export const addCamera = async (cameraData) => {
  try {
    const response = await api.post("/cameras", cameraData);
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
