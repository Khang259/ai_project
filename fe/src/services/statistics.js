import api from "./api";

const DEFAULT_TIME_RANGES = "00:00-23:59";

// Work status (InTask/Idle) theo khoảng ngày
export const getStatistics = async (
    startDate,
    endDate,
    deviceCodes = [],
    timeRanges = DEFAULT_TIME_RANGES
) => {
    try {
        const params = new URLSearchParams();
        params.set("start_date", startDate);
        params.set("end_date", endDate);
        params.set("time_ranges", timeRanges);

        if (Array.isArray(deviceCodes) && deviceCodes.length > 0) {
            params.set("device_names", deviceCodes.join(","));
        }

        const response = await api.get(`/analysis/all-robots-work-status?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error("[statistics.getStatistics] Request failed", error);
        throw error;
    }
};

// Format work status data từ API mới (analysis/all-robots-work-status)
export const formatWorkStatusByDevice = (apiResponse) => {
    if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
        return [];
    }

    // Gom dữ liệu theo deviceName
    const grouped = {};
    apiResponse.data.forEach(({ deviceName, state, totalDuration }) => {
        if (!grouped[deviceName]) {
            grouped[deviceName] = { deviceName, InTask: 0, Idle: 0, total: 0 };
        }
        if (state === "InTask") {
            grouped[deviceName].InTask += totalDuration;
        }
        if (state === "Idle") {
            grouped[deviceName].Idle += totalDuration;
        }
        grouped[deviceName].total += totalDuration;
    });

    // Tính phần trăm và format
    return Object.values(grouped).map((item) => {
        const { deviceName, InTask, Idle, total } = item;
        return {
            deviceCode: deviceName,
            deviceName: deviceName,
            InTask_percentage: total ? Number(((InTask / total) * 100).toFixed(2)) : 0,
            Idle_percentage: total ? Number(((Idle / total) * 100).toFixed(2)) : 0,
            total_duration: total,
        };
    });
};

// Giữ lại hàm cũ để tương thích (có thể xóa sau)
export const convertWorkStatusToChartData = formatWorkStatusByDevice;


export const getPayloadStatistics = async (
    startDate,
    endDate,
    deviceCodes = [],
    timeRanges = DEFAULT_TIME_RANGES
) => {
    try {
        const params = new URLSearchParams();
        params.set("start_date", startDate);
        params.set("end_date", endDate);
        params.set("time_ranges", timeRanges);

        if (Array.isArray(deviceCodes) && deviceCodes.length > 0) {
            params.set("device_names", deviceCodes.join(","));
        }

        const response = await api.get(`/analysis/all-robots-payload-statistics?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error("[statistics.getPayloadStatistics] Request failed", error);
        throw error;
    }
};

// Format payload data từ API mới (analysis/all-robots-payload-statistics)
export const formatPayloadByDevice = (apiResponse) => {
    if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
        return [];
    }

    return apiResponse.data.map((item) => {
        const total = item.total_duration ?? 0;
        const withLoad = item.duration_with_load ?? 0;
        const noLoad = item.duration_with_no_load ?? 0;

        return {
            deviceCode: item.deviceName,
            deviceName: item.deviceName,
            payLoad_1_0_percentage: total ? Number(((withLoad / total) * 100).toFixed(2)) : 0,
            payLoad_0_0_percentage: total ? Number(((noLoad / total) * 100).toFixed(2)) : 0,
            total_duration: total,
            total_tasks: item.total_tasks ?? 0,
        };
    });
};

// Giữ lại hàm cũ để tương thích (có thể xóa sau)
export const convertPayloadStatisticsToChartData = formatPayloadByDevice;

// Lấy SUMMARY work status - tổng hợp tất cả robots
export const getWorkStatusSummary = async (
    startDate,
    endDate,
    deviceCodes = [],
    timeRanges = DEFAULT_TIME_RANGES,
    states
) => {
    try {
        const params = new URLSearchParams();
        params.set("start_date", startDate);
        params.set("end_date", endDate);
        params.set("time_ranges", timeRanges);

        if (Array.isArray(deviceCodes) && deviceCodes.length > 0) {
            params.set("device_names", deviceCodes.join(","));
        }

        if (states && states.length > 0) {
            params.set("states", Array.isArray(states) ? states.join(",") : states);
        }

        const response = await api.get(`/analysis/all-robots-work-status-summary?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error("[statistics.getWorkStatusSummary] Request failed", error);
        throw error;
    }
};

// Format work status summary từ API mới
export const formatWorkStatusSummary = (apiResponse) => {
    const summary = { idle_duration: 0, intask_duration: 0, total_duration: 0 };
    if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
        return {
            idle_percentage: 0,
            inTask_percentage: 0,
            idle_duration: 0,
            intask_duration: 0,
        };
    }

    apiResponse.data.forEach(({ state, totalDuration }) => {
        if (state === "Idle") summary.idle_duration = totalDuration;
        if (state === "InTask") summary.intask_duration = totalDuration;
        summary.total_duration += totalDuration;
    });

    return {
        idle_duration: summary.idle_duration,
        intask_duration: summary.intask_duration,
        idle_percentage: summary.total_duration
            ? Number(((summary.idle_duration / summary.total_duration) * 100).toFixed(2))
            : 0,
        inTask_percentage: summary.total_duration
            ? Number(((summary.intask_duration / summary.total_duration) * 100).toFixed(2))
            : 0,
    };
};

// Lấy SUMMARY payload statistics - tổng hợp tất cả robots
export const getPayloadStatisticsSummary = async (
    startDate,
    endDate,
    deviceCodes = [],
    timeRanges = DEFAULT_TIME_RANGES
) => {
    try {
        const params = new URLSearchParams();
        params.set("start_date", startDate);
        params.set("end_date", endDate);
        params.set("time_ranges", timeRanges);

        if (Array.isArray(deviceCodes) && deviceCodes.length > 0) {
            params.set("device_names", deviceCodes.join(","));
        }

        const response = await api.get(`/analysis/all-robots-payload-statistics-summary?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error("[statistics.getPayloadStatisticsSummary] Request failed", error);
        throw error;
    }
};

// Format payload summary từ API mới
export const formatPayloadSummary = (apiResponse) => {
    const data = apiResponse?.data;
    if (!data) {
        return {
            payLoad_0_0_percentage: 0,
            payLoad_1_0_percentage: 0,
            total_duration: 0,
            total_tasks: 0,
        };
    }

    const total = data.total_duration ?? 0;
    const withLoad = data.total_duration_with_load ?? 0;
    const noLoad = data.total_duration_with_no_load ?? 0;

    return {
        payLoad_0_0_percentage: total ? Number(((noLoad / total) * 100).toFixed(2)) : 0,
        payLoad_1_0_percentage: total ? Number(((withLoad / total) * 100).toFixed(2)) : 0,
        total_duration: total,
        total_tasks: data.total_tasks ?? 0,
        unique_devices_count: data.unique_devices_count ?? 0,
    };
};
