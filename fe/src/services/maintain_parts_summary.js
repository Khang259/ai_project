import api from "./api"

export async function getMaintainPartsSummary() {
    try {
      const response = await api.get('/api/parts-summary')
      
      if (!response.data) {
        throw new Error(`Backend API error: ${response.status}`)
      }
      
      return response.data
    } catch (error) {
      console.error('Error fetching from backend:', error)
      throw new Error(`Failed to fetch parts summary: ${error.message}`)
    }
  }