// src/utils/format.js


const SUPPLY_DEMAND_MAIN_OVH_CELL_MAPPING = {
    1: "DCC_MAIN3",
    2: "DCC_OVH3",
  };
  
  // Mapping cho AE3 và AE4 dropdown options
  const DEMAND_AE3_CELL_MAPPING = {
    // AE3 options
    1: "AE3_XT_1",
    2: "AE3_XT_2", 
    3: "AE3_XT_3",
    4: "AE3_XT_4",
    5: "AE3_XT_5",
    6: "AE3_XT_6",
    7: "AE3_XT_7",
    8: "AE3_XT_8",
    9: "AE3_XT_9",
  };
  
  const DEMAND_AE4_CELL_MAPPING = {
    // AE4 options
    1: "AE4_XT_1",
    2: "AE4_XT_2",
    3: "AE4_XT_3", 
    4: "AE4_XT_4",
    5: "AE4_XT_5"
  };
  
  // Mapping cho Supply Grid Cell Labels - AE3 (cells 1-9)
  const SUPPLY_AE3_CELL_MAPPING = {
    1: "DCC_3C1",    // 10000676
    2: "DCC_3A1",    // 10000675
    3: "DCC_3C2",    // 10000674
    4: "DCC_3C3",    // 10003137
    5: "DCC_3B1",    // 10000618
    6: "DCC_3C4",    // 10000617
    7: "DCC_3S2",    // 10000613
    8: "DCC_3S1",    // 10000612
    9: "DCC_3AECT"   // 10000627
  };
  
  // Mapping cho Supply Grid Cell Labels - AE4 (cells 1-10)
  const SUPPLY_AE4_CELL_MAPPING = {
    1: "DCC_4C1",    // 10000607
    2: "DCC_4B1",    // 10000630
    3: "DCC_4C5",    // 10000625
    4: "DCC_4AECT",  // 10000624
    5: "DCC_4C4",    // 10000626
    6: "DCC_4C3",    // 10000628
    7: "DCC_4C2",    // 10000629
    8: "DCC_4C6",    // 10000623
    9: "DCC_4S1",    // 10000610
    10: "DCC_4S2"    // 10000611
  };
  
  /**
   * Format cell label cho Supply grid dựa trên user type
   * @param {number} cellNumber - Số cell (1-9 cho AE3, 1-10 cho AE4)
   * @param {string} currentKhu - Khu vực hiện tại
   * @param {boolean} isUserAE3 - Có phải user AE3 không
   * @param {boolean} isUserAE4 - Có phải user AE4 không
   * @returns {string} - Label cho cell
   */
  export const formatSupplyCellLabel = (cellNumber, currentKhu, isUserAE3, isUserAE4, isUserMainOvh) => {
    if (currentKhu !== 'Supply') {
      return formatCellLabel(cellNumber, currentKhu); // Fallback to original function
    }
    
    if (isUserAE3 && SUPPLY_AE3_CELL_MAPPING[cellNumber]) {
      return SUPPLY_AE3_CELL_MAPPING[cellNumber];
    }
    
    if (isUserAE4 && SUPPLY_AE4_CELL_MAPPING[cellNumber]) {
      return SUPPLY_AE4_CELL_MAPPING[cellNumber];
    }
  
    if (isUserMainOvh && SUPPLY_DEMAND_MAIN_OVH_CELL_MAPPING[cellNumber]) {
      return SUPPLY_DEMAND_MAIN_OVH_CELL_MAPPING[cellNumber];
    }
    // Fallback to original format nếu không match
    return formatCellLabel(cellNumber, currentKhu);
  };
  
  
  export const formatDemandCellLabel = (cellNumber, currentKhu, isUserAE3, isUserAE4, isUserMainOvh) => {
    if (currentKhu !== 'Demand') {
      return formatCellLabel(cellNumber, currentKhu); // Fallback to original function
    }
    
    if (isUserAE3 && DEMAND_AE3_CELL_MAPPING[cellNumber]) {
      return DEMAND_AE3_CELL_MAPPING[cellNumber];
    }
    
    if (isUserAE4 && DEMAND_AE4_CELL_MAPPING[cellNumber]) {
      return DEMAND_AE4_CELL_MAPPING[cellNumber];
    }
  
    if (isUserMainOvh && SUPPLY_DEMAND_MAIN_OVH_CELL_MAPPING[cellNumber]) {
      return SUPPLY_DEMAND_MAIN_OVH_CELL_MAPPING[cellNumber];
    }
    // Fallback to original format nếu không match
    return formatCellLabel(cellNumber, currentKhu);
  };
  
  
  export const formatCellLabel = (cellNumber, currentKhu) => {
    return `Chưa có dữ liệu`;
  };