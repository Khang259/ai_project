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
import AMRWarehouseMap from "@/components/map/AMRWarehouseMap/AMRWarehouseMap"
import LeafletMap from "@/components/map/AMRWarehouseMap/Map"

// const { loading: zipLoading, error: zipError, zipFileName, handleZipImport } = useZipImport();


export default function Dashboard() {
  const fileInputRef = useRef(null)
  const [mapData, setMapData] = useState(null)
  const [securityConfig, setSecurityConfig] = useState(null)
  const [selectedAvoidanceMode, setSelectedAvoidanceMode] = useState(null)
  const { loading, error, zipFileName, handleZipImport } = useZipImport()
  
  //min-h-screen → chiều cao tối thiểu bằng 100% chiều cao màn hình (viewport height).
  // bg-white → nền màu trắng.
  // flex → bật Flexbox cho container.
  // flex-1 → phần tử con chiếm toàn bộ không gian còn lại của flex container (grow = 1)
  // p-8 → padding đều 32px (8 × 4px).
  // bg-gray-50 → nền màu xám nhạt.
  // mb-8 → margin bottom 32px.
  // flex items-center → căn giữa các phần tử con theo chiều dọc.
  // justify-between → căn giữa theo chiều ngang và phân bố đều khoảng cách giữa các phần tử con.
  // mb-6 → margin bottom 24px.
  // flex items-center gap-3 → căn giữa các phần tử con theo chiều dọc và có khoảng cách 12px giữa chúng.
  // hidden → ẩn phần tử.
  // text-2xl font-semibold text-gray-900 → text size 24px, font weight 600, màu xám đen.
  // flex items-center gap-2 → căn giữa các phần tử con theo chiều dọc và có khoảng cách 8px giữa chúng.
  // w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center → hình tròn gradient từ màu tím đến xanh lá cây, kích thước 32px.
  // font-semibold text-white → font weight 600, màu trắng.
  // text-sm text-gray-500 → text size 12px, màu xám nhạt.
  // capitalize → viết hoa chữ cái đầu tiên của mỗi từ.
  // mx-1 → margin horizontal 4px.
  // relative → căn giữa theo chiều ngang và phân bố đều khoảng cách giữa các phần tử con.
  // absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 → vị trí tuyệt đối, cách 12px bên trái, ở giữa theo chiều dọc, màu xám nhạt, kích thước 16px.
  // pl-10 w-80 bg-gray-50 border-gray-200 focus:bg-white → padding left 40px, chiều rộng 320px, nền màu xám nhạt, border màu xám nhạt, focus: nền màu trắng khi focus.
  // relative → căn giữa theo chiều ngang và phân bố đều khoảng cách giữa các phần tử con.
  // ghost → không có nền, không có border.
  // size="icon" → kích thước icon.
  // relative → căn giữa theo chiều ngang và phân bố đều khoảng cách giữa các phần tử con.
  // absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full → vị trí tuyệt đối, cách 4px bên trên và 4px bên phải, hình tròn gradient từ màu đỏ đến xanh lá cây, kích thước 8px.
  // font-semibold text-gray-900 → font weight 600, màu xám đen.
  // text-sm text-gray-500 → text size 12px, màu xám nhạt.


  return (
    <div className="min-h-screen bg-white"> 
      <div className="flex">
        {/* Main Content */}
        <main className="flex-1 bg-gray-50">
           <div className="grid grid-cols-3 gap-8">
             {/* Main Content Area */}
             <div className="col-span-4">
               {/* Charts Section */}
               <AMRWarehouseMap />
               <Card className="border-gray-200">
                 <CardContent>
                 </CardContent>
               </Card>

               {/* Workflow Status Table */}
               <Card className="border-gray-200">
               </Card>
             </div>
           </div>  
        </main>
      </div>
    </div>
  )
}