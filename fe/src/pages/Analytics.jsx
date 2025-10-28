import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { useArea } from "@/contexts/AreaContext";
import { getStatistics, getPayloadStatistics,convertWorkStatusToChartData, convertPayloadStatisticsToChartData } from "@/services/statistics";
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Pie,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DateFilter } from "@/components/Analytics/DateFilter";


const workflowDistribution = [
  { name: "Product Sync", value: 35, color: "#8b5cf6" },
  { name: "Data Processing", value: 25, color: "#3b82f6" },
  { name: "Notifications", value: 20, color: "#10b981" },
  { name: "Analytics", value: 15, color: "#f59e0b" },
  { name: "Other", value: 5, color: "#ef4444" },
]

export default function AnalyticsPage() {
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(),
    endDate: new Date()
  })
  const [workStatusData, setWorkStatusData] = useState(null)
  const [payloadData, setPayloadData] = useState(null)
  const [workStatusChartData, setWorkStatusChartData] = useState([])
  const [payloadChartData, setPayloadChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { currAreaName, currAreaId } = useArea()

  // Helper: Date -> YYYY-MM-DD (tránh lệch múi giờ/locale)
  const toYMD = (d) => {
    if (!(d instanceof Date)) return null
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // Hàm xử lý khi filter thay đổi
  const handleFilterChange = (startDate, endDate) => {
    setDateFilter({ startDate, endDate })
  }

  // Hàm để lấy dữ liệu từ backend
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Chỉ fetch khi đã chọn range từ DateFilter
      if (!dateFilter.startDate || !dateFilter.endDate) {
        return
      }

      const startDate = toYMD(dateFilter.startDate)
      const endDate = toYMD(dateFilter.endDate)

      console.log("[Analytics] Fetching data for:", { startDate, endDate })
      // Lấy dữ liệu work status theo khoảng ngày
      const workStatusResponse = await getStatistics(startDate, endDate)
      setWorkStatusData(workStatusResponse)
      
      // Lấy dữ liệu payload statistics theo khoảng ngày (giữ state = InTask)
      const payloadResponse = await getPayloadStatistics(startDate, endDate, "InTask")
      setPayloadData(payloadResponse)
      
      // Chuyển đổi sang format cho charts
      const workStatusChartData = convertWorkStatusToChartData(workStatusResponse)
      const payloadChartData = convertPayloadStatisticsToChartData(payloadResponse)
      console.log("[Analytics] Chart data work status:", workStatusChartData)
      console.log("[Analytics] Chart data payload:", payloadChartData)
      setWorkStatusChartData(workStatusChartData)
      setPayloadChartData(payloadChartData)

    } catch (err) {
      console.error("[Analytics] Lỗi khi lấy dữ liệu:", err)
      setError(err.message || "Có lỗi xảy ra khi tải dữ liệu")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    fetchData()
    
    // Thiết lập interval để refresh mỗi 1'
    const interval = setInterval(() => {
      fetchData()
    }, 60000)
    
    // Cleanup interval khi component unmount
    return () => {
      clearInterval(interval)
    }
  }, [dateFilter]) // Re-run khi dateFilter thay đổi

  return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-gray-900 mt-4 ml-4">Trang thống kê</h1>
          </div>
          {/* Filter */}
          <div className="flex items-center gap-3">
            <DateFilter onFilterChange={handleFilterChange} />
            <Button variant="outline" className="gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Execution Trends */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle>Thời gian làm và nghỉ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={workStatusChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="deviceCode" stroke="#6b7280" fontSize={12} />
                        <YAxis 
                        stroke="#6b7280" 
                        fontSize={12} 
                        domain={[0, 100]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Bar dataKey="InTask_percentage" fill="#10b981" name="InTask %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Success vs Failed */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle>Thời gian tải và không tải</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={payloadChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="deviceCode" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Bar dataKey="payLoad_1_0_percentage" fill="#ef4444" name="Payload %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="workflows" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Workflow Distribution */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle>Workflow Distribution</CardTitle>
                  <CardDescription>Execution breakdown by workflow type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={workflowDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {workflowDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Workflows */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle>Top Performing Workflows</CardTitle>
                  <CardDescription>Most executed workflows this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {workflowDistribution.map((workflow, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: workflow.color }}></div>
                          <span className="font-medium text-gray-900">{workflow.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{workflow.value}%</span>
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                            {Math.floor(workflow.value * 50)} runs
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  )
}