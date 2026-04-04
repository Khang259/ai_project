import api from "./api"

export async function getPartDetailByAMR(maLinhKien) {
  try {
    const response = await api.get(`/api/part/${encodeURIComponent(maLinhKien)}/amr`)
    
    if (!response.data) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    return response.data
  } catch (error) {
    console.error('Error fetching part detail by AMR:', error)
    throw new Error(`Failed to fetch part detail: ${error.message}`)
  }
}

export async function updatePartDate(amrId, maLinhKien, ngayUpdate) {
  try {
    const response = await api.put('/api/part/update-date', {
      amr_id: amrId,
      "Mã linh kiện": maLinhKien,
      "Ngày update": ngayUpdate
    })
    
    if (!response.data) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    return response.data
  } catch (error) {
    console.error('Error updating part date:', error)
    throw new Error(`Failed to update part date: ${error.message}`)
  }
}
