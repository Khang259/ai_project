/**
 * Format date to DD-MM-YYYY format
 * @param {string} dateString - Date string in various formats
 * @returns {string} - Formatted date as DD-MM-YYYY or DD-MM-YYYY hh:mm:ss if time is included
 */
export function formatDateToDDMMYYYY(dateString) {
    if (!dateString) return ''
    
    try {
      // Parse the date string
      const date = new Date(dateString)
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString // Return original if invalid
      }
      
      // Get day, month, year
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      
      // Check if the original string has time information
      const hasTime = dateString.includes('T') && dateString.includes(':')
      
      if (hasTime) {
        // Get hours, minutes, seconds
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        
        return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
      }
      
      return `${day}-${month}-${year}`
    } catch (error) {
      console.error('Error formatting date:', error)
      return dateString // Return original if error
    }
  }
  
  /**
   * Parse date string from DD-MM-YYYY format
   * @param {string} dateString - Date string in DD-MM-YYYY format
   * @returns {Date} - Date object
   */
  export function parseDateFromDDMMYYYY(dateString) {
    if (!dateString) return null
    
    try {
      const [day, month, year] = dateString.split('-')
      return new Date(year, month - 1, day)
    } catch (error) {
      console.error('Error parsing date:', error)
      return null
    }
  }
  