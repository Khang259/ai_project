import React, { useContext } from "react";
import { AreaContext } from "../contexts/AreaContext";

export default function AreaSelector() {
  const { areaData, currAreaName, setCurrAreaName, setCurrAreaId } =
    useContext(AreaContext);

  const handleSelect = (e) => {
    const selectedName = e.target.value;
    const selected = areaData.find((a) => a.areaName === selectedName);
    if (selected) {
      setCurrAreaName(selected.areaName);
      setCurrAreaId(selected.areaId);
    }
  };

  return (
    <select value={currAreaName} onChange={handleSelect}>
      {areaData.map((area) => (
        <option key={area.key} value={area.areaName}>
          {area.title}
        </option>
      ))}
    </select>
  );
}
