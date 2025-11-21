// services/notification.js
import api from "./api";

export async function getNotifications({ page = 1, limit = 20, filters = {} }) {
    try {
        const params = {
            page,
            limit,
            ...filters,
        };

        const response = await api.get("/notifications", { params });

        const responseData = response.data;

        const dataArray = responseData.data || responseData.items || responseData || [];
        const totalCount = responseData.total_items;

        console.log("[NOTIFICATION] Raw response:", responseData);
        console.log("[NOTIFICATION] Parsed - dataArray.length:", dataArray.length, "| total:", totalCount);

        return {
            data: dataArray,
            total: totalCount,
            page,
            limit,
        };
    } catch (error) {
        console.error("[NOTIFICATION] Error fetching notifications:", error);
        throw error;
    }
}


//Wait backend have this endpoint
export async function getNotificationsByGroupId() {
    try {
        const respone = await api.get("/n")
    } catch (error) {
        console.log("[DEBUG-getNotificationByGroupID]", error)
        throw error
    }
}