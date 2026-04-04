import api from "./api";

export const getRoles = async () => {
  try {
    const response = await api.get("/roles/");
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error("[roles.getRoles] Request failed", { status, data });
    throw new Error(data?.detail || data?.message || error.message || "Lỗi khi lấy danh sách roles");
  }
};
