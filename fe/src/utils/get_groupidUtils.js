/**
 * Lấy group_id từ user trong localStorage
 * @returns {number|null} group_id hoặc null nếu không có
 */
export const getGroupId = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      return user?.group_id ?? null;
    } catch (error) {
      console.error("[userUtils.getGroupId] Error parsing user:", error);
      return null;
    }
  };
  
  