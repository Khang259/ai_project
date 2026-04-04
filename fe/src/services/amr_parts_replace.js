import api from "./api"

export async function getSumPartsReplaceAll() {
  try {
    const response = await api.get('/api/sum-parts-replace-all')
    
    if (!response.data) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    return response.data
  } catch (error) {
    console.error('Error fetching parts replace data:', error)
    throw new Error(`Failed to fetch parts replace data: ${error.message}`)
  }
}

export async function updateAMRName(oldAmrId, newAmrId) {
  try {
    const response = await api.put('/api/amr/update-name', {
      old_amr_id: oldAmrId,
      new_amr_id: newAmrId
    })
    
    if (!response.data) {
      throw new Error(response.data?.message || 'Lỗi khi cập nhật tên AMR')
    }
    
    return response.data
  } catch (error) {
    console.error('Error updating AMR name:', error)
    throw new Error(`Failed to update AMR name: ${error.message}`)
  }
}
