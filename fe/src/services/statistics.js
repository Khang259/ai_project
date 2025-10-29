import api from "./api";

// Work status (InTask/Idle) theo khoảng ngày
export const getStatistics = async (startDate, endDate, deviceCodes = []) => {
    try {
        const qs = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            ...(Array.isArray(deviceCodes) && deviceCodes.length > 0 ? { device_code: deviceCodes.join(',') } : {})
        }).toString();
        const response = await api.get(`/all-robots-work-status?${qs}`);
        return response.data;
    } catch (error) {
        console.error("[statistics.getStatistics] Request failed", error);
        throw error;
    }
}

// Chuyển đổi work status data sang format cho charts
export const convertWorkStatusToChartData = (workStatusData) => {
    if (!workStatusData || !Array.isArray(workStatusData.robots)) {
        return []
    }

    const chartData = workStatusData.robots.map(robot => {
        const timeSeries = robot.time_series || {}
        const dates = Object.keys(timeSeries)
        const latestDate = dates.sort().slice(-1)[0]
        const latest = latestDate ? timeSeries[latestDate] : {}

        return {
            deviceCode: robot.device_code,
            deviceName: robot.device_name,
            InTask_percentage: latest?.InTask_percentage ?? 0,
            Idle_percentage: latest?.Idle_percentage ?? 0,
            total_records: latest?.total_records ?? 0
        }
    })

    return chartData
}


export const getPayloadStatistics = async (startDate, endDate, deviceCodes = []) => {
    try {
        const qs = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            ...(Array.isArray(deviceCodes) && deviceCodes.length > 0 ? { device_code: deviceCodes.join(',') } : {})
        }).toString();
        const response = await api.get(`/all-robots-payload-statistics?${qs}`);
        return response.data;
    } catch (error) {
        console.error("[statistics.getPayloadStatistics] Request failed", error);
        throw error;
    }
}

// Hàm để chuyển đổi payloadStatisticsData sang format cho charts
export const convertPayloadStatisticsToChartData = (payloadStatisticsData) => {
    // Chỉ lấy phần robots từ API /all-robots-payload-statistics
    if (!payloadStatisticsData || !Array.isArray(payloadStatisticsData.robots)) {
        return []
    }

    const chartData = payloadStatisticsData.robots.map(robot => {
        const timeSeries = robot.time_series || {}
        const dates = Object.keys(timeSeries)
        const latestDate = dates.sort().slice(-1)[0]
        const latest = latestDate ? timeSeries[latestDate] : {}

        return {
            deviceCode: robot.device_code,
            deviceName: robot.device_name,
            payLoad_0_0_percentage: latest?.payLoad_0_0_percentage ?? 0,
            payLoad_1_0_percentage: latest?.payLoad_1_0_percentage ?? 0,
            total_records: latest?.total_records ?? 0
        }
    })

    return chartData
}

// Lấy SUMMARY work status - tổng hợp tất cả robots
export const getWorkStatusSummary = async (startDate, endDate, deviceCodes = []) => {
    try {
        const qs = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            ...(Array.isArray(deviceCodes) && deviceCodes.length > 0 ? { device_code: deviceCodes.join(',') } : {})
        }).toString();
        const response = await api.get(`/all-robots-work-status-summary?${qs}`);
        return response.data;
    } catch (error) {
        console.error("[statistics.getWorkStatusSummary] Request failed", error);
        throw error;
    }
}

// Lấy SUMMARY payload statistics - tổng hợp tất cả robots
export const getPayloadStatisticsSummary = async (startDate, endDate, deviceCodes = []) => {
    try {
        const qs = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            ...(Array.isArray(deviceCodes) && deviceCodes.length > 0 ? { device_code: deviceCodes.join(',') } : {})
        }).toString();
        const response = await api.get(`/all-robots-payload-statistics-summary?${qs}`);
        return response.data;
    } catch (error) {
        console.error("[statistics.getPayloadStatisticsSummary] Request failed", error);
        throw error;
    }
}
