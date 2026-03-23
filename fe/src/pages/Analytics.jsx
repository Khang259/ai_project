import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { useArea } from "@/contexts/AreaContext";
import { 
  getRobotsStats, 
  formatWorkStatusByDevice, 
  formatPayloadByDevice, 
  formatWorkStatusSummaryFromRobots,
  formatPayloadSummaryFromRobots,
  getTaskDetailsStats,
  getTaskDurationDistribution,
} from "@/services/statistics";
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Pie,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateFilter } from "@/components/Analytics/DateFilter";
import { AMRFilter } from "@/components/Analytics/AMRFilter";
import DeepAnalysisMapPanel from "@/components/AnalyticsDeep/DeepAnalysisMapPanel";
import DeepAnalysisTaskPanel from "@/components/AnalyticsDeep/DeepAnalysisTaskPanel";
import { getRobotsByAreaId } from "@/services/route";

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { currAreaId } = useArea()
  // Mặc định khi mở trang: không truyền ngày → backend lấy ngày mới nhất và chia 890 (1 ngày)
  const [activeTab, setActiveTab] = useState('performance')
  const [dateFilter, setDateFilter] = useState({ startDate: null, endDate: null })
  const [workStatusChartData, setWorkStatusChartData] = useState([])
  const [payloadChartData, setPayloadChartData] = useState([])
  const [workStatusSummary, setWorkStatusSummary] = useState(null)
  const [payloadSummary, setPayloadSummary] = useState(null)
  const [selectedDeviceCodes, setSelectedDeviceCodes] = useState([])
  const [areaRobotList, setAreaRobotList] = useState([]) // Danh sách AMR theo area (API /routes/area/{id}/robots)
  // Danh sách device_position key (string) từ robot-data-by-task → vẽ lên map
  const [robotPath, setRobotPath] = useState([])
  // Danh sách điểm chờ { posKey, duration } → vẽ chấm vàng trên map
  const [waitSpots, setWaitSpots] = useState([])
  // Điểm start/end từ task_path → vẽ icon lên map
  const [taskPoints, setTaskPoints] = useState([])
  const [taskDetailsSummary, setTaskDetailsSummary] = useState(null)
  const [durationDistribution, setDurationDistribution] = useState([])

  // Tạo data cho pie chart work status (dùng cho tab Workflows sau này)
  const getWorkStatusPieData = () => {
    if (!workStatusSummary) return []
    return [
      { name: t('analytics.working'), value: workStatusSummary.inTask_percentage, color: "#3b82f6" },
      { name: t('analytics.rest'), value: workStatusSummary.idle_percentage, color: "#10b981" },
    ]
  }

  // Tạo data cho pie chart payload (dùng cho tab Workflows sau này)
  const getPayloadPieData = () => {
    if (!payloadSummary) return []
    return [
      { name: t('analytics.loaded'), value: payloadSummary.payLoad_1_0_percentage, color: "#ef4444" },
      { name: t('analytics.unloaded'), value: payloadSummary.payLoad_0_0_percentage, color: "#FFD600" },
    ]
  }

  // avg_total_duration = tổng 3 phase (tính trên FE, không dùng từ BE)
  const getTaskAvgTotal = () => {
    if (!taskDetailsSummary) return 0
    return (taskDetailsSummary.avg_Get_shelf ?? 0)
      + (taskDetailsSummary.avg_Shelf_lifting ?? 0)
      + (taskDetailsSummary.avg_Shelf_transport ?? 0)
  }

  // Pie 3 phần: Get_shelf | Shelf_lifting | Shelf_transport
  const getPhasePieData = () => {
    if (!taskDetailsSummary) return []
    const total = getTaskAvgTotal()
    if (total === 0) return []
    const pct = (v) => Math.round((v / total) * 10000) / 100
    return [
      { name: t('analytics.getShelf'),      value: pct(taskDetailsSummary.avg_Get_shelf ?? 0),       color: "#8b5cf6" },
      { name: t('analytics.shelfLifting'),   value: pct(taskDetailsSummary.avg_Shelf_lifting ?? 0),   color: "#3b82f6" },
      { name: t('analytics.shelfTransport'), value: pct(taskDetailsSummary.avg_Shelf_transport ?? 0), color: "#f97316" },
    ]
  }

  // Tỉ lệ vận chuyển (%) để hiển thị badge
  const getTransportRatio = () => {
    if (!taskDetailsSummary) return null
    const total = getTaskAvgTotal()
    if (total === 0) return null
    return Math.round((taskDetailsSummary.avg_Shelf_transport / total) * 10000) / 100
  }

  // Pie data cho phân bổ thời gian thực hiện
  const getDurationDistPieData = () => {
    if (!durationDistribution || durationDistribution.length === 0) return []
    const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#f97316", "#ef4444"]
    const LABELS = [
      t('analytics.under2min'),
      t('analytics.2to3min'),
      t('analytics.3to4min'),
      t('analytics.4to5min'),
      t('analytics.over5min'),
    ]
    return durationDistribution.map((b, i) => ({
      name:       LABELS[i],
      value:      b.percentage,
      count:      b.count,
      color:      COLORS[i],
    }))
  }

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

  // Chỉ gọi API khi vào trang hoặc đổi filter (không refetch theo thời gian)
  const fetchData = async () => {
    try {
      // Không truyền ngày → backend trả về ngày mới nhất có trong DB
      const startDate = dateFilter.startDate ? toYMD(dateFilter.startDate) : null
      const endDate = dateFilter.endDate ? toYMD(dateFilter.endDate) : null

      const response = await getRobotsStats(startDate, endDate, selectedDeviceCodes, currAreaId)
      const robots = response?.robots ?? []

      setWorkStatusChartData(formatWorkStatusByDevice(response) ?? [])
      setPayloadChartData(formatPayloadByDevice(response) ?? [])
      setWorkStatusSummary(formatWorkStatusSummaryFromRobots(robots))
      setPayloadSummary(formatPayloadSummaryFromRobots(robots))
    } catch (err) {
      console.error("[Analytics] Lỗi khi lấy dữ liệu:", err)
      setWorkStatusChartData([])
      setPayloadChartData([])
      setWorkStatusSummary(null)
      setPayloadSummary(null)
    }
  }
  useEffect(() => {
    fetchData()
  }, [dateFilter, selectedDeviceCodes, currAreaId]) // Chỉ gọi khi mở trang hoặc đổi filter / area / device

  // Lấy thống kê task_details (gộp chung tất cả robot)
  // Mặc định truyền ngày hôm nay nếu FE chưa chọn filter
  useEffect(() => {
    const fetchTaskDetails = async () => {
      try {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
        const defaultDate = toYMD(yesterday)
        const startDate = dateFilter.startDate ? toYMD(dateFilter.startDate) : defaultDate
        const endDate = dateFilter.endDate ? toYMD(dateFilter.endDate) : defaultDate
        const res = await getTaskDetailsStats(startDate, endDate, selectedDeviceCodes, currAreaId)
        setTaskDetailsSummary(res?.summary ?? null)
      } catch (err) {
        console.error("[Analytics] Lỗi khi lấy task details stats:", err)
        setTaskDetailsSummary(null)
      }
    }
    fetchTaskDetails()
  }, [dateFilter, selectedDeviceCodes, currAreaId])

  // Lấy phân bổ số lệnh theo khoảng thời gian thực hiện
  useEffect(() => {
    const fetchDurationDist = async () => {
      try {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
        const defaultDate = toYMD(yesterday)
        const startDate = dateFilter.startDate ? toYMD(dateFilter.startDate) : defaultDate
        const endDate = dateFilter.endDate ? toYMD(dateFilter.endDate) : defaultDate
        const res = await getTaskDurationDistribution(startDate, endDate, selectedDeviceCodes, currAreaId)
        setDurationDistribution(res?.distribution ?? [])
      } catch (err) {
        console.error("[Analytics] Lỗi khi lấy duration distribution:", err)
        setDurationDistribution([])
      }
    }
    fetchDurationDist()
  }, [dateFilter, selectedDeviceCodes, currAreaId])

  // Lấy danh sách robot theo area cho mục chọn AMR
  useEffect(() => {
    if (currAreaId == null || currAreaId === "") {
      setAreaRobotList([])
      return
    }
    getRobotsByAreaId(currAreaId)
      .then((res) => {
        if (res?.status === "success" && Array.isArray(res.robots)) {
          setAreaRobotList(
            res.robots.map((name) => ({ deviceCode: name, deviceName: name }))
          )
        } else {
          setAreaRobotList([])
        }
      })
      .catch(() => setAreaRobotList([]))
  }, [currAreaId])

  return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-gray-50 mt-4 ml-4">{t('analytics.analytics')}</h1>
          </div>
          {/* Filter — ẩn khi ở tab Phân tích chuyên sâu */}
          {activeTab !== 'deep' && (
            <div className="flex items-center gap-3">
              <DateFilter onFilterChange={handleFilterChange} />
              <AMRFilter
                deviceList={areaRobotList}
                selectedDevices={selectedDeviceCodes}
                onFilterChange={setSelectedDeviceCodes}
              />
            </div>
          )}
        </div>

        <Tabs defaultValue="performance" className="space-y-6" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="performance">{t('analytics.performance')}</TabsTrigger>
            <TabsTrigger value="workflows">{t('analytics.workflows')}</TabsTrigger>
            <TabsTrigger value="deep">{t('analytics.deepAnalysis')}</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* InTask */}
              <Card className="border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-xl lg:text-2xl font-semibold tracking-wide">
                    {t('analytics.timeRangeIdleAndTask')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden">
                    <div className="w-full min-h-[14rem] h-[50vh] sm:min-h-[16rem]">
                      <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                          data={workStatusChartData} 
                          key={workStatusChartData.length}
                          margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
                          barCategoryGap="4%"
                        >
                          <XAxis dataKey="deviceName" stroke="#cccdd1" fontSize={12} tick={{ fontSize: 11 }} />
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
                            name={t('analytics.inTask') ?? "Làm việc %"}
                            maxBarSize={56}
                            isAnimationActive={true}
                            animationDuration={800}
                            animationEasing="ease-out"
                            label={{ position: 'top', formatter: (v) => v ? `${v}%` : '', fill: '#fff', fontSize: 11 }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Có hàng / Không hàng */}
              <Card className="border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-xl lg:text-2xl font-semibold tracking-wide">
                    {t('analytics.timeRangeWithPayloadandWithoutPayload')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden">
                    <div className="w-full min-h-[14rem] h-[50vh] sm:min-h-[16rem]">
                      <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                          data={payloadChartData} 
                          key={payloadChartData.length}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          barCategoryGap="4%"
                        >
                          <XAxis dataKey="deviceName" stroke="#6b7280" fontSize={12} tick={{ fontSize: 11 }} />
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
                            name={t('analytics.withLoad') ?? "Có hàng %"}
                            maxBarSize={56}
                            isAnimationActive={true}
                            animationDuration={800}
                            animationEasing="ease-out"
                            label={{ position: 'top', formatter: (v) => v ? `${v}%` : '', fill: '#fff', fontSize: 11 }}
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
              <Card className="border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-xl lg:text-2xl font-semibold tracking-wide">
                    {t('analytics.workingTime')}
                  </CardTitle>
                  <CardDescription className="text-gray-200 text-base lg:text-lg">
                    {t('analytics.workingRestRatio')}
                  </CardDescription>
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
                  <div className="mt-4 flex justify-center gap-6">
                    {getWorkStatusPieData().map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-white text-base font-medium">{item.name}: {item.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-xl lg:text-2xl font-semibold tracking-wide">
                    {t('analytics.loadingTime')}
                  </CardTitle>
                  <CardDescription className="text-gray-200 text-base lg:text-lg">
                    {t('analytics.loadedUnloadedRatio')}
                  </CardDescription>
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
                  <div className="mt-4 flex justify-center gap-6">
                    {getPayloadPieData().map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-white text-base font-medium">{item.name}: {item.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Hàng 2: 1 pie chart phân bổ phase + 1 card trống ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie: Phân bổ thời gian 3 giai đoạn */}
              <Card className="border-gray-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <CardTitle className="text-white text-xl lg:text-2xl font-semibold tracking-wide">
                      {t('analytics.phaseDuration')}
                    </CardTitle>
                    {taskDetailsSummary && getTaskAvgTotal() > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-white/10 text-gray-200 border border-white/20">
                        {t('analytics.totalAvgDuration')}: {getTaskAvgTotal().toFixed(2)}s
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-gray-200 text-base lg:text-lg">
                    {t('analytics.phaseBreakdown')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-160">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={getPhasePieData()}
                          cx="50%"
                          cy="50%"
                          outerRadius={200}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {getPhasePieData().map((entry, index) => (
                            <Cell key={`cell-ph-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value}%`} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex justify-center gap-6 flex-wrap">
                    {taskDetailsSummary && [
                      { name: t('analytics.getShelf'),      color: "#8b5cf6", avg: taskDetailsSummary.avg_Get_shelf },
                      { name: t('analytics.shelfLifting'),  color: "#3b82f6", avg: taskDetailsSummary.avg_Shelf_lifting },
                      { name: t('analytics.shelfTransport'),color: "#f97316", avg: taskDetailsSummary.avg_Shelf_transport },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-white text-base font-medium">{item.name}: {item.avg}s</span>
                      </div>
                    ))}
                  </div>
                  {taskDetailsSummary && (
                    <p className="text-center text-gray-400 text-sm mt-3">
                      {t('analytics.totalTasks')}: {taskDetailsSummary.total_tasks}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Pie: Phân bổ số lệnh theo thời gian thực hiện */}
              <Card className="border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-xl lg:text-2xl font-semibold tracking-wide">
                    {t('analytics.durationDistTitle')}
                  </CardTitle>
                  <CardDescription className="text-gray-200 text-base lg:text-lg">
                    {t('analytics.durationDistDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-160">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={getDurationDistPieData()}
                          cx="50%"
                          cy="50%"
                          outerRadius={200}
                          dataKey="value"
                          label={({ name, value }) => value > 0 ? `${name}: ${value}%` : ''}
                        >
                          {getDurationDistPieData().map((entry, index) => (
                            <Cell key={`cell-dd-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name, props) => [
                            `${props.payload.count} ${t('analytics.tasks')} (${value}%)`,
                            name,
                          ]}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex justify-center gap-4 flex-wrap">
                    {getDurationDistPieData().map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-white text-sm sm:text-base font-medium">
                          {item.name}: {item.count} {t('analytics.tasks')}
                        </span>
                      </div>
                    ))}
                  </div>
                  {durationDistribution.length > 0 && (
                    <p className="text-center text-gray-400 text-sm mt-3">
                      {t('analytics.totalTasks')}: {durationDistribution.reduce((s, b) => s + b.count, 0)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="deep">
            {/* Layout 2 cột: laptop (md+) nằm ngang, mobile xếp dọc */}
            <div className="flex flex-col md:flex-row w-full gap-0
                            min-h-[60vh] sm:min-h-[65vh] md:min-h-[68vh] lg:min-h-[70vh] fullhd:min-h-[72vh]">

              {/* ── Cột trái: Danh sách lệnh ── */}
              <div className="flex-1 min-w-0 min-h-0 flex flex-col
                              pr-0 md:pr-4 lg:pr-6 fullhd:pr-8
                              pb-3 md:pb-0">
                <DeepAnalysisTaskPanel onRobotPath={setRobotPath} onWaitSpots={setWaitSpots} onTaskPoints={setTaskPoints} />
              </div>

              {/* ── Thanh ngăn cách ── */}
              <div
                className="flex-shrink-0
                           w-full h-[3px] md:w-[3px] md:h-auto md:self-stretch
                           bg-[rgb(34,189,189)] opacity-90
                           my-3 md:my-0 md:mx-0"
                aria-hidden
              />

              {/* ── Cột phải: Bản đồ ── */}
              <div className="flex-1 min-w-0 min-h-0 flex flex-col
                              pl-0 md:pl-4 lg:pl-6 fullhd:pl-8
                              pt-0">
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden
                                min-h-[40vh] md:min-h-0">
                  <DeepAnalysisMapPanel robotPath={robotPath} waitSpots={waitSpots} taskPoints={taskPoints} />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  )
}