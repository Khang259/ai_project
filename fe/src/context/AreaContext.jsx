import React, { createContext, useState, useEffect } from "react";
import { mockAreaData } from "../data/mockAreaData";

export const AreaContext = createContext();

export const AreaProvider = ({ children }) => {
  const [areaData, setAreaData] = useState(mockAreaData.areaData);
  const [currAreaName, setCurrAreaName] = useState(mockAreaData.currAreaName);
  const [currAreaId, setCurrAreaId] = useState(mockAreaData.currAreaId);
  const [visible, setVisible] = useState(mockAreaData.visible);

  // Load lại từ localStorage khi reload
  useEffect(() => {
    const saved = localStorage.getItem("areaState");
    if (saved) {
      const { currAreaName, currAreaId } = JSON.parse(saved);
      setCurrAreaName(currAreaName);
      setCurrAreaId(currAreaId);
    }
  }, []);

  // Lưu khi đổi area
  useEffect(() => {
    localStorage.setItem(
      "areaState",
      JSON.stringify({ currAreaName, currAreaId })
    );
  }, [currAreaName, currAreaId]);

  return (
    <AreaContext.Provider
      value={{
        areaData,
        currAreaName,
        currAreaId,
        visible,
        setCurrAreaName,
        setCurrAreaId,
        setVisible
      }}
    >
      {children}
    </AreaContext.Provider>
  );
};
