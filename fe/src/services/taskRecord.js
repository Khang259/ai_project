import api from "./api";

export async function getTaskRecord({ page = 1, limit = 20, filter = {} }) {
    try {
        const params = {
            page,
            limit,
            ...filter
        };

        const response = await api.get("/tasks", { params });
        const responseData = response.data;

        // Parse response similar to notification service
        const dataArray = responseData.data || responseData.items || responseData || [];
        const totalCount = responseData.total_items;

        return {
            data: dataArray,
            total: totalCount,
            page,
            limit,
        };
    } catch (error) {
        console.error("[ERROR-taskRecord]", error);
        throw error;
    }
}