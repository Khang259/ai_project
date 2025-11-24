import { useState, useEffect } from 'react';
import { getRoutes, 
        createRoute as createRouteService, 
        updateRoute as updateRouteService, 
        deleteRoute as deleteRouteService,
        getRoutesByCreator as getRoutesByCreatorService } from '@/services/route';

export const useRoute = () => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                setLoading(true);
                const data = await getRoutes();
                setRoutes(data || []);
            } catch (error) {
                console.log("[DEBUG-useRoute]:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchRoutes();
    }, []);

    const createRoute = async (routeData) => {
        try {
            const data = await createRouteService(routeData);
            if (data) {
                setRoutes(prev => [data, ...prev]);
            }
            return data;
        } catch (error) {
            console.log("[DEBUG-useRoute-createRoute]:", error);
            throw error;
        }
    };

    const updateRoute = async (routeId, routeData) => {
        try {
            const data = await updateRouteService(routeId, routeData);
            if (data) {
                setRoutes(prev => prev.map(route => route.id === routeId ? data : route));
            }
            return data;
        } catch (error) {
            console.log("[DEBUG-useRoute-updateRoute]:", error);
            throw error;
        }
    };

    const deleteRoute = async (routeId) => {
        try {
            await deleteRouteService(routeId);
            setRoutes(prev => prev.filter(route => route.id !== routeId));
        } catch (error) {
            console.log("[DEBUG-useRoute-deleteRoute]:", error);
            throw error;
        }
    };

    const getRoutesByCreator = async (creator) => {
        try {
            const data = await getRoutesByCreatorService(creator);
            setRoutes(data || []);
        } catch (error) {
            console.log("[DEBUG-useRoute-getRoutesByCreator]:", error);
            throw error;
        }
    };

    return { routes, loading, createRoute, updateRoute, deleteRoute, getRoutesByCreator };
};