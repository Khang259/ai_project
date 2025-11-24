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

        console.log("[DEBUG-taskRecord] Raw response:", response);
        console.log("[DEBUG-taskRecord] responseData:", responseData);
        console.log("[DEBUG-taskRecord] responseData.data:", responseData.data);
        console.log("[DEBUG-taskRecord] responseData.total_items:", responseData.total_items);

        // Parse response similar to notification service
        const dataArray = responseData.data || responseData.items || responseData || [];
        const totalCount = responseData.total_items;

        console.log("[DEBUG-taskRecord] Final dataArray:", dataArray);
        console.log("[DEBUG-taskRecord] Final totalCount:", totalCount);

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