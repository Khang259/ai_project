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
