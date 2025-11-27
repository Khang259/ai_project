import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { useArea } from "@/contexts/AreaContext";
import { 
  getStatistics, 
  getPayloadStatistics, 
  formatWorkStatusByDevice, 
  formatPayloadByDevice, 
  getWorkStatusSummary, 
  getPayloadStatisticsSummary,
  formatWorkStatusSummary,
  formatPayloadSummary
} from "@/services/statistics";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateFilter } from "@/components/Analytics/DateFilter";
import { AMRFilter } from "@/components/Analytics/AMRFilter";


export default function AnalyticsPage() {
  const { t } = useTranslation()
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(),
    endDate: new Date()
  })
  const [workStatusChartData, setWorkStatusChartData] = useState([])
  const [payloadChartData, setPayloadChartData] = useState([])
  const [workStatusSummary, setWorkStatusSummary] = useState(null)
  const [payloadSummary, setPayloadSummary] = useState(null)
  const [selectedDeviceCodes, setSelectedDeviceCodes] = useState([])

  // Helper: Date -> YYYY-MM-DD (tránh lệch múi giờ/locale)
  const toYMD = (d) => {
    if (!(d instanceof Date)) return null
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // Tạo data cho pie chart work status
  const getWorkStatusPieData = () => {
    if (!workStatusSummary) return []
    
    return [
      { 
        name: "Làm việc", 
        value: workStatusSummary.inTask_percentage, 
        color: "#3b82f6" 
      },
      { 
        name: "Nghỉ", 
        value: workStatusSummary.idle_percentage, 
        color: "#10b981" 
      }
    ]
  }

  // Tạo data cho pie chart payload
  const getPayloadPieData = () => {
    if (!payloadSummary) return []
    
    return [
      { 
        name: "Có hàng", 
        value: payloadSummary.payLoad_1_0_percentage, 
        color: "#ef4444" 
      },
      { 
        name: "Không hàng", 
        value: payloadSummary.payLoad_0_0_percentage, 
        color: "#FFD600" // solid yellow
      }
    ]
  }

  // Hàm xử lý khi filter thay đổi
  const handleFilterChange = (startDate, endDate) => {
    setDateFilter({ startDate, endDate })
  }

  // Hàm để lấy dữ liệu từ backend
  const fetchData = async () => {
    try {
      // Chỉ fetch khi đã chọn range từ DateFilter
      if (!dateFilter.startDate || !dateFilter.endDate) {
        return
      }

      const startDate = toYMD(dateFilter.startDate)
      const endDate = toYMD(dateFilter.endDate)

      // Lấy dữ liệu work status và payload statistics theo khoảng ngày
      const workStatusResponse = await getStatistics(startDate, endDate, selectedDeviceCodes)
      const payloadResponse = await getPayloadStatistics(startDate, endDate, selectedDeviceCodes)
      
      const workStatusSummaryResponse = await getWorkStatusSummary(startDate, endDate, selectedDeviceCodes)
      const formattedWorkStatusSummary = formatWorkStatusSummary(workStatusSummaryResponse)
      setWorkStatusSummary(formattedWorkStatusSummary)
      
      const payloadSummaryResponse = await getPayloadStatisticsSummary(startDate, endDate, selectedDeviceCodes)
      const formattedPayloadSummary = formatPayloadSummary(payloadSummaryResponse)
      setPayloadSummary(formattedPayloadSummary)
      
      // Chuyển đổi sang format cho charts
      const workStatusChartData = formatWorkStatusByDevice(workStatusResponse)
      const payloadChartData = formatPayloadByDevice(payloadResponse)
      setWorkStatusChartData(workStatusChartData)
      setPayloadChartData(payloadChartData)

    } catch (err) {
      console.error("[Analytics] Lỗi khi lấy dữ liệu:", err)
    }
  }
  useEffect(() => {
    fetchData()
    
    // Thiết lập interval để refresh mỗi 10s
    const interval = setInterval(() => {
      fetchData()
    }, 10000)
    
    // Cleanup interval khi component unmount
    return () => {
      clearInterval(interval)
    }
  }, [dateFilter, selectedDeviceCodes]) // Re-run khi filter thay đổi

  return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-gray-50 mt-4 ml-4">{t('analytics.analytics')}</h1>
          </div>
          {/* Filter */}
          <div className="flex items-center gap-3">
            <DateFilter onFilterChange={handleFilterChange} />
            <AMRFilter
              deviceList={workStatusChartData.map(d => ({ deviceCode: d.deviceCode, deviceName: d.deviceName }))}
              selectedDevices={selectedDeviceCodes}
              onFilterChange={setSelectedDeviceCodes}
            />
          </div>
        </div>

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList>
            <TabsTrigger value="performance">{t('analytics.performance')}</TabsTrigger>
            <TabsTrigger value="workflows">{t('analytics.workflows')}</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Execution Trends */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle>{t('analytics.timeRangeIdleAndTask')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="h-80" style={{ minWidth: `${workStatusChartData.length * 350}px` }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={workStatusChartData} key={workStatusChartData.length}>
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
                          <Bar 
                            dataKey="InTask_percentage" 
                            fill="#3b82f6" 
                            name="InTask %"
                            isAnimationActive={true}
                            animationDuration={800}
                            animationEasing="ease-out"
                            label={{ 
                              position: 'top', 
                              formatter: (value) => `${value}%`,
                              fill: '#3b82f6',
                              fontSize: 25 
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Success vs Failed */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle>{t('analytics.timeRangeWithPayloadandWithoutPayload')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="h-80" style={{ minWidth: `${payloadChartData.length * 350}px` }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={payloadChartData} key={payloadChartData.length}>
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
                          <Bar 
                            dataKey="payLoad_1_0_percentage" 
                            fill="#ef4444" 
                            name="Payload %"
                            isAnimationActive={true}
                            animationDuration={800}
                            animationEasing="ease-out"
                            label={{ 
                              position: 'top', 
                              formatter: (value) => `${value}%`,
                              fill: '#ef4444',
                              fontSize: 25 
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
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
                  <CardTitle>Thời gian làm việc</CardTitle>
                  <CardDescription>Tý lệ làm việc/nghỉ</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-160">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={getWorkStatusPieData()}
                          cx="50%"
                          cy="50%"
                          outerRadius={200}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {getWorkStatusPieData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Chú thích */}
                  <div className="mt-4 flex justify-center gap-6">
                    {getWorkStatusPieData().map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm text-gray-600">
                          {item.name}: {item.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payload Statistics */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle>Thời gian tải hàng</CardTitle>
                  <CardDescription>Tỷ lệ có hàng/không hàng</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-160">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={getPayloadPieData()}
                          cx="50%"
                          cy="50%"
                          outerRadius={200}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {getPayloadPieData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Chú thích */}
                  <div className="mt-4 flex justify-center gap-6">
                    {getPayloadPieData().map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm text-gray-600">
                          {item.name}: {item.value}%
                        </span>
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