import api from "./api";

export const getStreamCamera = async (rtspUrl) => {
  try {
    // ✅ Debug: Kiểm tra baseURL
    console.log('🔍 API baseURL:', api.defaults.baseURL);
    console.log('🔍 RTSP URL:', rtspUrl);
    
    // ✅ Không cần gọi API, chỉ tạo URL stream
    const baseUrl = api.defaults.baseURL || 'http://192.168.1.6:8001';
    const streamUrl = `${baseUrl}/cameras/stream?rtsp_url=${encodeURIComponent(rtspUrl)}`;
    
    console.log('🔍 Generated stream URL:', streamUrl);
    console.log('✅ Returning stream URL:', streamUrl);
    return streamUrl;
  } catch (error) {
    console.error("Error getting stream camera:", error);
    throw new Error(error.message || "Lỗi khi lấy stream camera");
  }
};