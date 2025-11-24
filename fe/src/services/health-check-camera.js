// import api from "./api";

// export const healthCheckCamera = async (timeout = 30) => {
//   try {
//     const response = await api.get('/cameras/health-check')
    
//     if (!response.data) {
//       throw new Error(`Backend API error: ${response.status}`)
//     }
    
//     return response.data
//   } catch (error) {
//     console.error('Error fetching health check camera:', error)
//     throw new Error(`Failed to fetch health check camera: ${error.message}`)
//   }
// }