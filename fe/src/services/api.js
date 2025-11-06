import axios from "axios";
import { refreshToken } from "./auth";
import { isTokenExpiringSoon, getTokenExpiration } from "../utils/tokenUtils";

// Testing var
export const defaultServers = [
  // { serverIP: '127.0.0.1:7000', endpoint: '/submit-data' },
  { serverIP: '127.0.0.1:7000', endpoint: '/ics/taskOrder/addTask' },
  { serverIP: '127.0.0.1:7000', endpoint: '/ics/out/endTask ' }
];

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://192.168.1.184:8001",
  headers: {
    "Content-Type": "application/json",
  },
});

// Biến để tránh nhiều request refresh đồng thời
let isRefreshing = false;
let failedQueue = [];
let refreshTimer = null;

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Tự động refresh token trước khi hết hạn
 */
const setupAutoRefresh = () => {
  // Clear timer cũ nếu có
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const token = localStorage.getItem("token");
  if (!token) return;

  const checkAndRefresh = async () => {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) return;

    // Kiểm tra nếu token sắp hết hạn trong 1 phút
    if (isTokenExpiringSoon(currentToken, 60)) {
      console.log("[api] Token sắp hết hạn, tự động refresh...");
      
      if (!isRefreshing) {
        try {
          isRefreshing = true;
          const { token: newToken } = await refreshToken();
          console.log("[api] Token đã được refresh thành công");
          
          // Setup lại timer cho token mới
          setupAutoRefresh();
        } catch (error) {
          console.error("[api] Lỗi khi auto refresh token:", error);
          // Nếu refresh thất bại, sẽ được xử lý bởi interceptor khi request thực sự
        } finally {
          isRefreshing = false;
        }
      }
    } else {
      // Tính toán thời gian còn lại đến khi cần refresh (trước 1 phút)
      const exp = getTokenExpiration(currentToken);
      if (exp) {
        const now = Math.floor(Date.now() / 1000);
        const timeUntilRefresh = exp - now - 60; // Trừ 60 giây để refresh trước 1 phút
        
        if (timeUntilRefresh > 0) {
          // Set timer để check lại sau
          refreshTimer = setTimeout(() => {
            checkAndRefresh();
          }, Math.min(timeUntilRefresh * 1000, 60000)); // Check tối đa mỗi 1 phút
        }
      }
    }
  };

  // Check ngay lập tức
  checkAndRefresh();
};

// Tự động setup khi app load
if (typeof window !== "undefined") {
  // Check khi app khởi động
  setupAutoRefresh();
  
  // Listen for storage changes (khi login từ tab khác)
  window.addEventListener("storage", (e) => {
    if (e.key === "token" && e.newValue) {
      setupAutoRefresh();
    }
  });
}

// Tự động cung cấp access token vào header Authorization
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem("token");
  
  // Kiểm tra và auto refresh nếu cần (trong request interceptor)
  if (token && isTokenExpiringSoon(token, 60) && !isRefreshing) {
    try {
      isRefreshing = true;
      const { token: newToken } = await refreshToken();
      config.headers.Authorization = `Bearer ${newToken}`;
      isRefreshing = false;
      return config;
    } catch (error) {
      isRefreshing = false;
      // Nếu refresh thất bại, vẫn tiếp tục với token cũ
      // Response interceptor sẽ xử lý nếu token thực sự hết hạn
    }
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý lỗi khi access token hết hạn/không hợp lệ
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail;

    // Kiểm tra nếu là lỗi 401 và không phải request refresh token
    if (
      status === 401 &&
      (detail === "Could not validate credentials" || detail?.includes("expired") || detail?.includes("invalid")) &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes("/auth/refresh")
    ) {
      // Tránh lặp vô hạn
      if (originalRequest._handledAuthError) {
        return Promise.reject(error);
      }

      // Nếu đang refresh, đợi
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { token: newToken } = await refreshToken();
        
        // Cập nhật header với token mới
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        // Setup lại auto refresh
        setupAutoRefresh();
        
        // Xử lý queue
        processQueue(null, newToken);
        isRefreshing = false;
        
        // Retry request ban đầu với token mới
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh thất bại → logout
        processQueue(refreshError, null);
        isRefreshing = false;
        
        originalRequest._handledAuthError = true;
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        
        // Clear auto refresh timer
        if (refreshTimer) {
          clearTimeout(refreshTimer);
          refreshTimer = null;
        }
        
        // Thông báo cho người dùng
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        window.location.replace("/login");
        
        return Promise.reject(refreshError);
      }
    }

    // Các lỗi khác
    return Promise.reject(error);
  }
);

// Export function để có thể gọi từ bên ngoài (sau khi login)
export const startAutoRefresh = () => {
  setupAutoRefresh();
};

export default api;

// Send payload to a list of servers/endpoints.
// Returns an array of result objects: { success, serverIP, endpoint, error? }
export async function sendData(
  payload,
  _unused1,
  _unused2,
  _unused3,
  servers,
  _serverIPs
) {
  const results = await Promise.all(
    (servers || []).map(async (srv) => {
      const endpoint = (srv.endpoint || "").trim();
      const url = `http://${srv.serverIP}${endpoint}`;
      try {
        const response = await axios.post(url, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        });
        const ok = response.status >= 200 && response.status < 300;
        return { success: ok, serverIP: srv.serverIP, endpoint };
      } catch (err) {
        return {
          success: false,
          serverIP: srv.serverIP,
          endpoint,
          error: err?.message || "Request failed",
        };
      }
    })
  );
  return results;
}