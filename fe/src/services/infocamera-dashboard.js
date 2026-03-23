import api from "./api";

export const getStreamCamera = async (rtspUrl) => {
  try {
    const baseUrl = api.defaults.baseURL || 'None';
    const streamUrl = `${baseUrl}/cameras/stream?rtsp_url=${encodeURIComponent(rtspUrl)}`;

    return streamUrl;
  } catch (error) {
    console.error("Error getting stream camera:", error);
    throw new Error(error.message || "Lỗi khi lấy stream camera");
  }
};

/** URL stream detected (YOLO) theo camera name: GET /cameras/{camera_name}/detected */
export const getDetectedStreamUrl = (cameraName) => {
  const baseUrl = api.defaults.baseURL || '';
  return `${baseUrl}/cameras/${encodeURIComponent(cameraName)}/detected`;
};