import { useState, useRef } from "react"
import useZipImport from "@/hooks/MapDashboard/useZipImport"

import useAGVWebSocket from '@/hooks/MapDashboard/useAGVWebsocket';
import AMRWarehouseMap from "@/components/Overview/map/AMRWarehouseMap/AMRWarehouseMap"
import LeafletMap from "@/components/Overview/map/AMRWarehouseMap/Map"
import StatisticsLeftSide from "@/components/Overview/statistics/StatisticsLeftSide"


export default function Dashboard() {
  const fileInputRef = useRef(null)
  const [mapData, setMapData] = useState(null)
  const [securityConfig, setSecurityConfig] = useState(null)
  const [selectedAvoidanceMode, setSelectedAvoidanceMode] = useState(null)
  const { loading, error, zipFileName, handleZipImport } = useZipImport()
  
  return (
    <div className="min-h-screen bg-white"> 
      <div className="flex h-[100%]">
        <div className="w-[100%] bg-gray-50 p-6">
          <div className="h-full space-y-6">
            <div className="rounded-lg overflow-hidden shadow-md">
              <AMRWarehouseMap />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}