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