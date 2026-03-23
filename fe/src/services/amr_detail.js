import api from "./api"

export async function getSumPartsReplaceByAMR(amrId) {
  try {
    const response = await api.get(`/api/sum-parts-replace/${amrId}`)
    
    if (!response.data) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    return response.data
  } catch (error) {
    console.error('Error fetching parts replace by AMR:', error)
    throw new Error(`Failed to fetch parts replace data: ${error.message}`)
  }
}

export async function getAMRParts(amrId) {
  try {
    const response = await api.get(`/api/amr/${amrId}/parts`)
    
    if (!response.data) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    return response.data
  } catch (error) {
    console.error('Error fetching AMR parts:', error)
    throw new Error(`Failed to fetch AMR parts: ${error.message}`)
  }
}

export async function updatePartWithLog(amrId, maLinhKien, ngayThayThe, ghiChu) {
  try {
    const response = await api.put('/api/part/update-with-log', {
      amr_id: amrId,
      ma_linh_kien: maLinhKien,
      ngay_thay_the: ngayThayThe,
      ghi_chu: ghiChu
    })
    
    if (!response.data) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    return response.data
  } catch (error) {
    console.error('Error updating part with log:', error)
    throw new Error(`Failed to update part: ${error.message}`)
  }
}
