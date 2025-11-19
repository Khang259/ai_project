import api from "./api";

export const clearMonitor = async (payload) => {
  try {
    const response = await api.post("/clear-monitor", payload);
    return { success: true, data: response.data };
  } catch (error) {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const data = error.response?.data;
    console.error("[services/taskStatus.clearMonitor] Request failed", {
      method,
      url,
      status,
      data,
      payload,
    });
    return {
      success: false,
      error: data?.detail || data?.message || error.message || "Clear monitor failed",
      status,
    };
  }
};

