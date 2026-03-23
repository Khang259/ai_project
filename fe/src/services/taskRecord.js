import api from "./api";

export async function getTaskDetailByOrderId(orderId) {
    const response = await api.get("/task-details/by-order", { params: { order_id: orderId } });
    return response.data?.data ?? null;
}

/**
 * Lấy danh sách bản ghi robot theo order_id từ /robot-data-by-task.
 * Trả về:
 *   positions  — mảng device_position key theo thứ tự created_at tăng dần
 *   waitSpots  — mảng { posKey, duration(s) } cho các điểm robot đứng chờ
 *                (cùng device_position xuất hiện ≥2 lần, duration = max-min updated_at)
 *   deviceName — tên thiết bị (device_name) lấy từ bản ghi đầu tiên
 *   startDate  — updated_at (hoặc created_at) của bản ghi đầu tiên
 *   endDate    — updated_at (hoặc created_at) của bản ghi cuối cùng
 */
export async function getRobotPathByOrderId(orderId) {
    const response = await api.get("/robot-data-by-task", { params: { order_id: orderId } });
    const records = response.data?.result ?? [];
    const sorted = [...records].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ta - tb;
    });
    const positions = sorted
        .map((r) => r.device_position)
        .filter((p) => p != null && String(p).trim() !== '');

    // Tính waitSpots: nhóm theo device_position, tìm các điểm có ≥2 bản ghi
    const groups = {};
    sorted.forEach((r) => {
        const pos = r.device_position;
        if (pos == null || String(pos).trim() === '') return;
        const key = String(pos).trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
    });
    const waitSpots = [];
    Object.entries(groups).forEach(([posKey, recs]) => {
        if (recs.length < 2) return;
        const times = recs
            .map((r) => r.updated_at ?? r.created_at)
            .filter(Boolean)
            .map((d) => new Date(d).getTime())
            .filter((t) => !isNaN(t));
        if (times.length < 2) return;
        const minT = Math.min(...times);
        const maxT = Math.max(...times);
        const duration = (maxT - minT) / 1000;
        if (duration > 0) waitSpots.push({
            posKey,
            duration,
            startTime: new Date(minT).toISOString(),
            endTime:   new Date(maxT).toISOString(),
        });
    });

    const first = sorted[0] ?? null;
    const last = sorted[sorted.length - 1] ?? null;
    const getDate = (rec) => rec?.updated_at ?? rec?.created_at ?? null;

    // Trích xuất task_path từ các bản ghi: lấy tất cả cặp (startNode, endNode) duy nhất
    // Format task_path: "10603376,18082546" → [startNodeId, endNodeId]
    const taskPoints = [];
    const seenPaths = new Set();
    sorted.forEach((r) => {
        const tp = r.task_path;
        if (!tp || seenPaths.has(String(tp))) return;
        seenPaths.add(String(tp));
        const parts = String(tp).split(',').map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
            taskPoints.push({ nodeId: parts[0], role: 'start' });
            taskPoints.push({ nodeId: parts[1], role: 'end' });
        }
    });

    return {
        positions,
        waitSpots,
        deviceName: first?.device_name ?? null,
        startDate:  getDate(first),
        endDate:    getDate(last),
        taskPoints,
    };
}

/**
 * Lấy danh sách notification theo device_name và khoảng thời gian.
 * device_name từ robot data (vd: "MS-16") → truyền vào param device_num.
 */
export async function getNotificationsByDevice(deviceName, startDate, endDate) {
    const params = { device_num: deviceName };
    if (startDate) params.start_date = startDate;
    if (endDate)   params.end_date   = endDate;
    const response = await api.get("/notifications-by-device", { params });
    return response.data?.data ?? [];
}

/**
 * Lấy danh sách task_details có total_duration lớn hơn threshold.
 * Trả về: { page, limit, total_items, total_pages, data }
 * Mỗi item có: order_id, total_duration, Get_shelf, Transition, Shelf_lifting, Shelf_transport, Shelf_release, ...
 */
export async function getTaskDetailsLongDuration({ threshold = 300, page = 1, limit = 20, area_id } = {}) {
    const params = { threshold, page, limit };
    if (area_id) params.area_id = area_id;
    const response = await api.get("/task-details/long-duration", { params });
    return response.data ?? {};
}

export async function getTaskRecord({ page = 1, limit = 20, filter = {} }) {
    try {
        const params = {
            page,
            limit,
            ...filter,
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