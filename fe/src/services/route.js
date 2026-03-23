//fe/src/services/route.js
import api from "./api";

export const createRoute = async (routeData) => { 
    try {
        const response = await api.post("/routes/", routeData);
        console.log("[DEBUG-createRoute]:", response.data);
        return response.data;
    } catch (error) {
        console.error("[DEBUG-createRoute]:", error);
        throw error;
    }
};

export const getRoutes = async () => { 
    try {
        const response = await api.get("/routes/");
        console.log("[DEBUG-getRoutes]:", response.data);
        return response.data;
    } catch (error) {
        console.error("[DEBUG-getRoutes]:", error);
        throw error;
    }
};

export const updateRoute = async (routeId, routeData) => {
    try {
        const response = await api.put(`/routes/${routeId}`, routeData);
        console.log("[DEBUG-updateRoute]:", response.data);
        return response.data;
    } catch (error) {
        console.error("[DEBUG-updateRoute]:", error);
        throw error;
    }
};

export const deleteRoute = async (routeId) => {
    try {
        await api.delete(`/routes/${routeId}`);
        console.log("[DEBUG-deleteRoute]: Route deleted successfully");
    } catch (error) {
        console.error("[DEBUG-deleteRoute]:", error);
        throw error;
    }
};

export const getRoutesByCreator = async (creator) => {
    try {
        const response = await api.get(`/routes/creator/${creator}`);
        console.log("[DEBUG-getRoutesByCreator]:", response.data);
        return response.data;
    } catch (error) {
        console.error("[DEBUG-getRoutesByCreator]:", error);
        throw error;
    }
};

/**
 * Lấy danh sách routes thuộc area theo area_id.
 * @param {string|number} areaId - ID khu vực
 * @returns {Promise<Array<{ id, route_id, route_name, area_id, group_id, robot_list, ... }>>}
 */
export const getRoutesByAreaId = async (areaId) => {
    const response = await api.get(`/routes/area/${areaId}/routes`);
    return Array.isArray(response.data) ? response.data : [];
};

/**
 * Lấy toàn bộ robot thuộc area (từ collection routes, gom robot_list theo area_id).
 * @param {string|number} areaId - ID khu vực
 * @returns {Promise<{ status: string, area_id: number, robots: string[], total: number }>}
 */
export const getRobotsByAreaId = async (areaId) => {
    const response = await api.get(`/routes/area/${areaId}/robots`);
    return response.data;
};
