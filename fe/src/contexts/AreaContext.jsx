import React, { createContext, useContext, useState } from 'react';
import { mockAreaData } from '../data/mockData';

const AreaContext = createContext();

export const useArea = () => {
  const context = useContext(AreaContext);
  if (!context) {
    throw new Error('useArea must be used within an AreaProvider');
  }
  return context;
};

export const AreaProvider = ({ children }) => {
  const [currAreaName, setCurrAreaName] = useState(mockAreaData.areaData[0].areaName);
  const [currAreaId, setCurrAreaId] = useState(mockAreaData.areaData[0].areaId);
  const [areaData] = useState(mockAreaData.areaData);

  const value = {
    areaData,
    currAreaName,
    setCurrAreaName,
    currAreaId,
    setCurrAreaId,
  };

  return (
    <AreaContext.Provider value={value}>
      {children}
    </AreaContext.Provider>
  );
};
