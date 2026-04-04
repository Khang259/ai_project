import api from "./api";

const DEFAULT_TIME_RANGES = "00:00-23:59";

// Phân bổ số lệnh theo khoảng thời gian thực hiện (task_details)
export const getTaskDurationDistribution = async (startDate, endDate, deviceCodes = [], areaId = null) => {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    if (areaId != null && areaId !== "") params.set("area_id", areaId);
    if (Array.isArray(deviceCodes) && deviceCodes.length > 0) {
        params.set("device_code", deviceCodes.join(","));
    }
    const response = await api.get(`/task-duration-distribution?${params.toString()}`);
    return response.data;
};

// Thống kê tổng hợp từ task_details (gộp chung tất cả robot)
export const getTaskDetailsStats = async (startDate, endDate, deviceCodes = [], areaId = null) => {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    if (areaId != null && areaId !== "") params.set("area_id", areaId);
    if (Array.isArray(deviceCodes) && deviceCodes.length > 0) {
        params.set("device_code", deviceCodes.join(","));
    }
    const response = await api.get(`/task-details-statistics?${params.toString()}`);
    return response.data;
};

// API chung: gọi 1 lần, trả về robots (Loaded, No load, InTask, Idle)
export const getRobotsStats = async (startDate, endDate, deviceCodes = [], areaId = null) => {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    if (areaId != null && areaId !== "") params.set("area_id", areaId);
    if (Array.isArray(deviceCodes) && deviceCodes.length > 0) {
        params.set("device_code", deviceCodes.join(","));
    }
    const response = await api.get(`/all-robots-payload-statistics?${params.toString()}`);
    return response.data;
};

// Work status (InTask/Idle) — wrapper gọi getRobotsStats, giữ tương thích
export const getStatistics = async (
    startDate,
    endDate,
    deviceCodes = [],
    timeRanges = DEFAULT_TIME_RANGES,
    areaId = null
) => {
    try {
        return await getRobotsStats(startDate, endDate, deviceCodes, areaId);
    } catch (error) {
        console.error("[statistics.getStatistics] Request failed", error);
        throw error;
    }
};

// Map API robots → data cho biểu đồ 1: Thời gian Làm việc / Nghỉ (InTask % vs Idle %)
export const formatWorkStatusByDevice = (apiResponse) => {
    if (!apiResponse?.robots || !Array.isArray(apiResponse.robots)) {
        return [];
    }
    return apiResponse.robots.map((r) => ({
        deviceCode: r.device_code,
        deviceName: r.device_name ?? r.device_code,
        InTask_percentage: Number(r.InTask_percentage ?? 0),
        Idle_percentage: Number(r.Idle_percentage ?? 0),
        total_duration: (Number(r.InTask_duration_minutes ?? 0) + Number(r.Idle_duration_minutes ?? 0)),
    }));
};

// Giữ lại hàm cũ để tương thích (có thể xóa sau)
export const convertWorkStatusToChartData = formatWorkStatusByDevice;


export const getPayloadStatistics = async (
    startDate,
    endDate,
    deviceCodes = [],
    timeRanges = DEFAULT_TIME_RANGES,
    areaId = null
) => {
    try {
        return await getRobotsStats(startDate, endDate, deviceCodes, areaId);
    } catch (error) {
        console.error("[statistics.getPayloadStatistics] Request failed", error);
        throw error;
    }
};

// Map API robots → data cho biểu đồ 2: Có hàng / Không hàng (Loaded % vs No load %)
export const formatPayloadByDevice = (apiResponse) => {
    if (!apiResponse?.robots || !Array.isArray(apiResponse.robots)) {
        return [];
    }
    return apiResponse.robots.map((r) => ({
        deviceCode: r.device_code,
        deviceName: r.device_name ?? r.device_code,
        payLoad_1_0_percentage: Number(r.payLoad_1_0_percentage ?? 0),
        payLoad_0_0_percentage: Number(r.payLoad_0_0_percentage ?? 0),
        total_duration: (Number(r.No_load_minutes ?? 0) + Number(r.Loaded_minutes ?? 0)),
        total_tasks: 0,
    }));
};

// Giữ lại hàm cũ để tương thích (có thể xóa sau)
export const convertPayloadStatisticsToChartData = formatPayloadByDevice;

// Tính work status summary từ mảng robots (sau khi gọi getRobotsStats 1 lần)
export const formatWorkStatusSummaryFromRobots = (robots) => {
    if (!Array.isArray(robots) || robots.length === 0) {
        return { idle_percentage: 0, inTask_percentage: 0, idle_duration: 0, intask_duration: 0 };
    }
    let idle_duration = 0;
    let intask_duration = 0;
    robots.forEach((r) => {
        idle_duration += r.Idle_duration_minutes ?? 0;
        intask_duration += r.InTask_duration_minutes ?? 0;
    });
    const total_duration = idle_duration + intask_duration;
    return {
        idle_duration,
        intask_duration,
        idle_percentage: total_duration ? Number(((idle_duration / total_duration) * 100).toFixed(2)) : 0,
        inTask_percentage: total_duration ? Number(((intask_duration / total_duration) * 100).toFixed(2)) : 0,
    };
};

// Tính payload summary từ mảng robots (sau khi gọi getRobotsStats 1 lần)
export const formatPayloadSummaryFromRobots = (robots) => {
    if (!Array.isArray(robots) || robots.length === 0) {
        return { payLoad_0_0_percentage: 0, payLoad_1_0_percentage: 0, total_duration: 0, total_tasks: 0, unique_devices_count: 0 };
    }
    let noLoad = 0;
    let withLoad = 0;
    robots.forEach((r) => {
        noLoad += r.No_load_minutes ?? 0;
        withLoad += r.Loaded_minutes ?? 0;
    });
    const total_duration = noLoad + withLoad;
    return {
        payLoad_0_0_percentage: total_duration ? Number(((noLoad / total_duration) * 100).toFixed(2)) : 0,
        payLoad_1_0_percentage: total_duration ? Number(((withLoad / total_duration) * 100).toFixed(2)) : 0,
        total_duration,
        total_tasks: 0,
        unique_devices_count: robots.length,
    };
};

// Lấy SUMMARY work status - tổng hợp tất cả robots (API riêng, dùng khi cần)
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