import api from "./api"

export async function getCheckLogs() {
  try {
    const response = await api.get('/api/check-logs')
    
    if (!response.data) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    return response.data
  } catch (error) {
    console.error('Error fetching check logs:', error)
    throw new Error(`Failed to fetch check logs: ${error.message}`)
  }
}

export async function getMaintenanceLogsChanges() {
  try {
    const response = await api.get('/api/maintenance-logs/changes')
    
    if (!response.data) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    return response.data
  } catch (error) {
    console.error('Error fetching maintenance logs changes:', error)
    throw new Error(`Failed to fetch maintenance logs changes: ${error.message}`)
  }
}

export async function getMaintenanceLogsByPart(amrId, maLinhKien) {
  try {
    const response = await api.get(`/api/maintenance-logs/${amrId}/${maLinhKien}`)
    
    if (!response.data) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    return response.data
  } catch (error) {
    console.error('Error fetching maintenance logs by part:', error)
    throw new Error(`Failed to fetch maintenance logs: ${error.message}`)
  }
}
