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

export async function checkMaintenanceWithNotes(idThietBi, notes) {
  try {
    const response = await api.post('/api/maintenance-check/check-with-notes', {
      id_thietBi: idThietBi,
      ghi_chu: notes,
      ngay_check: new Date().toISOString().split('T')[0]
    })
    
    if (!response.data) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    return response.data
  } catch (error) {
    console.error('Error checking maintenance with notes:', error)
    throw new Error(`Failed to check maintenance with notes: ${error.message}`)
  }
}