/**
 * VHL API Service
 * Cấu hình API_BASE qua biến môi trường VITE_VHL_API_BASE trong file .env
 * Mặc định: http://192.168.50.18:9998
 */
const API_BASE = (import.meta.env.VITE_API_URL || 'http://192.168.50.18:6868').replace(/\/+$/, '') + '/vhl'

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.detail || `HTTP ${res.status}`)
  }
  return data
}

/** Gửi lệnh yêu cầu VHL */
export async function requestVHL(payload) {
  const res = await fetch(`${API_BASE}/request-vhl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse(res)
}

/** Cập nhật trạng thái slot */
export async function updateSlotState(payload) {
  const res = await fetch(`${API_BASE}/update-state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse(res)
}

/** Lấy danh sách trạng thái các toa (Slots) */
export async function getCarriages() {
  const res = await fetch(`${API_BASE}/get-slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  return handleResponse(res)
}
