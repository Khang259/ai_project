import { useState } from "react";
import { BarChart3, Activity, Clock, CheckCircle, XCircle, Download } from "lucide-react";
import { useArea } from "@/contexts/AreaContext";
import {
  LineChart,
  Line,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const performanceData = [
  { name: "AGV_01", executions: 4000, success: 3800, failed: 200, avgDuration: 45 },
  { name: "AGV_02", executions: 3000, success: 2850, failed: 150, avgDuration: 42 },
  { name: "AGV_03", executions: 5000, success: 4900, failed: 100, avgDuration: 38 },
  { name: "AGV_04", executions: 2780, success: 2650, failed: 130, avgDuration: 41 },
  { name: "AGV_05", executions: 1890, success: 1820, failed: 70, avgDuration: 39 },
  { name: "AGV_06", executions: 2390, success: 2300, failed: 90, avgDuration: 37 },
  { name: "AGV_07", executions: 3490, success: 3400, failed: 90, avgDuration: 35 },
]

const workflowDistribution = [
  { name: "Product Sync", value: 35, color: "#8b5cf6" },
  { name: "Data Processing", value: 25, color: "#3b82f6" },
  { name: "Notifications", value: 20, color: "#10b981" },
  { name: "Analytics", value: 15, color: "#f59e0b" },
  { name: "Other", value: 5, color: "#ef4444" },
]

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d")
  const { currAreaName, currAreaId } = useArea()

  return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-gray-900 mt-4 ml-4">Trang thống kê</h1>
          </div>
          {/* Filter */}
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 ngày gần nhất</SelectItem>
                <SelectItem value="30d">30 ngày gần nhất</SelectItem>
                <SelectItem value="90d">90 ngày gần nhất</SelectItem>
                <SelectItem value="1y">1 năm gần nhất</SelectItem>
              </SelectContent>
            </Select>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Execution Trends */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle>Thời gian tải và không tải</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Bar dataKey="success" fill="#10b981" name="Success" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Success vs Failed */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle>Thời gian làm và nghỉ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Bar dataKey="success" fill="#10b981" name="Success" />

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