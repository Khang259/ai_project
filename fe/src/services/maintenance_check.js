import api from "./api"

export async function getMaintenanceCheck() {
  try {
    const response = await api.get('/api/maintenance-check')
    
    if (!response.data) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    return response.data
  } catch (error) {
    console.error('Error fetching maintenance check data:', error)
    throw new Error(`Failed to fetch maintenance check data: ${error.message}`)
  }
}

export async function updateMaintenanceStatus(idThietBi, newStatus, ngayCheck = null) {
  try {
    const payload = {
      id_thietBi: idThietBi,
      trang_thai: newStatus
    }
    
    if (ngayCheck) {
      payload.ngay_check = ngayCheck
    }
    
    const response = await api.put('/api/maintenance-check/update-status', payload)
    
    if (!response.data) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    return response.data
  } catch (error) {
    console.error('Error updating maintenance status:', error)
    throw new Error(`Failed to update maintenance status: ${error.message}`)
  }
}
