import { useState, useRef } from "react"
import {
  Workflow,
  AlertTriangle,
  RefreshCw,
  MoreHorizontal,
  Filter,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  Plus,
  Users,
  Eye,
} from "lucide-react"
import { AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import useZipImport from "@/hooks/MapDashboard/useZipImport"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import useAGVWebSocket from '@/hooks/MapDashboard/useAGVWebsocket';
import AMRWarehouseMap from "@/components/Overview/map/AMRWarehouseMap/AMRWarehouseMap"
import LeafletMap from "@/components/Overview/map/AMRWarehouseMap/Map"
import StatisticsLeftSide from "@/components/Overview/statistics/StatisticsLeftSide"

// const { loading: zipLoading, error: zipError, zipFileName, handleZipImport } = useZipImport();


export default function Dashboard() {
  const fileInputRef = useRef(null)
  const [mapData, setMapData] = useState(null)
  const [securityConfig, setSecurityConfig] = useState(null)
  const [selectedAvoidanceMode, setSelectedAvoidanceMode] = useState(null)
  const { loading, error, zipFileName, handleZipImport } = useZipImport()
  
  return (
    <div className="min-h-screen bg-white"> 
      <div className="flex h-[100%]">
        {/* Left Column - 30% */} 
        <div className="w-[25%] bg-gray-50 rounded-lg p-6">
          <div className="h-full space-y-6">
            <div className="rounded-lg overflow-hidden shadow-lg">
              <StatisticsLeftSide />
            </div>
          </div>
        </div>

        {/* Right Column - 70% */}
        <div className="w-[75%] bg-gray-50 p-6">
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