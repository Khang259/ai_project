import api from "./api";

export const getStatistics = async (timeFilter = "d") => {
    try {
        const response = await api.get(`/work-status?time_filter=${timeFilter}`);
        return response.data;
    } catch (error) {
        console.error("[statistics.getStatistics] Request failed", error);
        throw error;
    }
}

// Hàm để lọc dữ liệu workStatusData chỉ lấy deviceCode, InTask_percentage, Idle_percentage
export const filterWorkStatusData = (workStatusData) => {
    if (!workStatusData || !workStatusData.data) {
        return null
    }

    const filteredData = {
        status: workStatusData.status,
        filter_type: workStatusData.filter_type,
        time_range: workStatusData.time_range,
        time_unit: workStatusData.time_unit,
        data: {
            time_series: {},
            device_summary: {},
            summary: {
                total_InTask_percentage: workStatusData.data.summary?.total_InTask_percentage || 0,
                total_Idle_percentage: workStatusData.data.summary?.total_Idle_percentage || 0,
                total_records: workStatusData.data.summary?.total_records || 0
            }
        }
    }

    // Lọc time_series data
    if (workStatusData.data.time_series) {
        Object.keys(workStatusData.data.time_series).forEach(date => {
            const dayData = workStatusData.data.time_series[date]
            filteredData.data.time_series[date] = {
                InTask_percentage: dayData.InTask_percentage || 0,
                Idle_percentage: dayData.Idle_percentage || 0,
                total_records: dayData.total_records || 0,
                devices: {}
            }

            // Lọc devices trong time_series
            if (dayData.devices) {
                Object.keys(dayData.devices).forEach(deviceCode => {
                    const deviceData = dayData.devices[deviceCode]
                    filteredData.data.time_series[date].devices[deviceCode] = {
                        device_code: deviceData.device_code,
                        device_name: deviceData.device_name,
                        InTask_percentage: deviceData.InTask_percentage || 0,
                        Idle_percentage: deviceData.Idle_percentage || 0,
                        total_records: deviceData.total_records || 0
                    }
                })
            }
        })
    }

    // Lọc device_summary data
    if (workStatusData.data.device_summary) {
        Object.keys(workStatusData.data.device_summary).forEach(deviceCode => {
            const deviceData = workStatusData.data.device_summary[deviceCode]
            filteredData.data.device_summary[deviceCode] = {
                device_code: deviceData.device_code,
                device_name: deviceData.device_name,
                InTask_percentage: deviceData.InTask_percentage || 0,
                Idle_percentage: deviceData.Idle_percentage || 0,
                total_records: deviceData.total_records || 0
            }
        })
    }

    return filteredData
}

// Hàm để chuyển đổi workStatusData sang format cho charts
export const convertWorkStatusToChartData = (workStatusData) => {
    if (!workStatusData || !workStatusData.data || !workStatusData.data.device_summary) {
        return []
    }

    const chartData = []
    Object.keys(workStatusData.data.device_summary).forEach(deviceCode => {
        const deviceData = workStatusData.data.device_summary[deviceCode]
        chartData.push({
            deviceCode: deviceData.device_code,
            deviceName: deviceData.device_name,
            InTask_percentage: deviceData.InTask_percentage || 0,
            Idle_percentage: deviceData.Idle_percentage || 0,
            total_records: deviceData.total_records || 0
        })
    })

    return chartData
}

export const getPayloadStatistics = async (timeFilter = "d", state = "InTask", deviceCode = null) => {
    try {
        let url = `/payload-statistics?time_filter=${timeFilter}&state=${state}`;
        if (deviceCode) {
            url += `&device_code=${deviceCode}`;
        }
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        console.error("[statistics.getPayloadStatistics] Request failed", error);
        throw error;
    }
}

export const filterPayloadStatisticsData = (payloadStatisticsData) => {
    if (!payloadStatisticsData || !payloadStatisticsData.data) {
        return null
    }

    const filteredData = {
        status: payloadStatisticsData.status,
        filter_type: payloadStatisticsData.filter_type,
        time_range: payloadStatisticsData.time_range,
        time_unit: payloadStatisticsData.time_unit,
        data: {
            time_series: {},    
            device_summary: {},
            summary: {
                    total_payLoad_0_0_percentage: payloadStatisticsData.data.summary?.total_payLoad_0_0_percentage || 0,
                    total_payLoad_1_0_percentage: payloadStatisticsData.data.summary?.total_payLoad_1_0_percentage || 0,
                total_records: payloadStatisticsData.data.summary?.total_records || 0
            }
        }
    }

    // Lọc time_series data
    if (payloadStatisticsData.data.time_series) {
        Object.keys(payloadStatisticsData.data.time_series).forEach(date => {
            const dayData = payloadStatisticsData.data.time_series[date]
            filteredData.data.time_series[date] = {
                payLoad_0_0_percentage: dayData.payLoad_0_0_percentage || 0,
                payLoad_1_0_percentage: dayData.payLoad_1_0_percentage || 0,
                total_records: dayData.total_records || 0,
                devices: {}
            }

            // Lọc devices trong time_series
            if (dayData.devices) {
                Object.keys(dayData.devices).forEach(deviceCode => {
                    const deviceData = dayData.devices[deviceCode]
                    filteredData.data.time_series[date].devices[deviceCode] = {
                        device_code: deviceData.device_code,
                        device_name: deviceData.device_name,
                        payLoad_0_0_percentage: dayData.payLoad_0_0_percentage || 0,
                        payLoad_1_0_percentage: dayData.payLoad_1_0_percentage || 0,
                        total_records: deviceData.total_records || 0
                    }
                })
            }
        })
    }

    // Lọc device_summary data
    if (payloadStatisticsData.data.device_summary) {
        Object.keys(payloadStatisticsData.data.device_summary).forEach(deviceCode => {
            const deviceData = payloadStatisticsData.data.device_summary[deviceCode]
            filteredData.data.device_summary[deviceCode] = {
                device_code: deviceData.device_code,
                device_name: deviceData.device_name,
                payLoad_0_0_percentage: deviceData.payLoad_0_0_percentage || 0,
                payLoad_1_0_percentage: deviceData.payLoad_1_0_percentage || 0,
                total_records: deviceData.total_records || 0
            }
        })
    }

    return filteredData
}

// Hàm để chuyển đổi payloadStatisticsData sang format cho charts
export const convertPayloadStatisticsToChartData = (payloadStatisticsData) => {
    if (!payloadStatisticsData || !payloadStatisticsData.data || !payloadStatisticsData.data.device_summary) {
        return []
    }

    const chartData = []
    Object.keys(payloadStatisticsData.data.device_summary).forEach(deviceCode => {
        const deviceData = payloadStatisticsData.data.device_summary[deviceCode]
        chartData.push({
            deviceCode: deviceData.device_code,
            deviceName: deviceData.device_name,
            payLoad_0_0_percentage: deviceData.payLoad_0_0_percentage || 0,
            payLoad_1_0_percentage: deviceData.payLoad_1_0_percentage || 0,
            total_records: deviceData.total_records || 0
        })
    })

    return chartData
}
