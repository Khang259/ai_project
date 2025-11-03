"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { getCheckLogs, getMaintenanceLogsChanges } from "@/services/maintenance_history"
import { formatDateToDDMMYYYY } from "@/utils/dateFormatter"

export default function MaintenanceHistoryTable() {
  const [checkLogs, setCheckLogs] = useState({ success: true, total_logs: 0, logs: [] })
  const [changesLogs, setChangesLogs] = useState({ success: true, total_logs: 0, logs: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchCheck, setSearchCheck] = useState("")
  const [searchChanges, setSearchChanges] = useState("")
  const [debouncedSearchCheck, setDebouncedSearchCheck] = useState("")
  const [debouncedSearchChanges, setDebouncedSearchChanges] = useState("")

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        const [dataCheck, dataChanges] = await Promise.all([
          getCheckLogs(),
          getMaintenanceLogsChanges()
        ])
        setCheckLogs(dataCheck)
        setChangesLogs(dataChanges)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // Debounce search terms to reduce filter computations
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearchCheck(searchCheck.trim().toLowerCase()), 200)
    return () => clearTimeout(id)
  }, [searchCheck])

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearchChanges(searchChanges.trim().toLowerCase()), 200)
    return () => clearTimeout(id)
  }, [searchChanges])

  // Pre-index rows into haystacks for fast includes() search across all nested fields
  const indexedCheckLogs = useMemo(() => {
    return (checkLogs.logs || []).map((row) => ({ row, haystack: buildHaystack(row) }))
  }, [checkLogs.logs])

  const indexedChangesLogs = useMemo(() => {
    return (changesLogs.logs || []).map((row) => ({ row, haystack: buildHaystack(row) }))
  }, [changesLogs.logs])

  const filteredCheckLogs = useMemo(() => {
    if (!debouncedSearchCheck) return checkLogs.logs
    return indexedCheckLogs
      .filter((it) => it.haystack.includes(debouncedSearchCheck))
      .map((it) => it.row)
  }, [indexedCheckLogs, checkLogs.logs, debouncedSearchCheck])

  const filteredChangesLogs = useMemo(() => {
    if (!debouncedSearchChanges) return changesLogs.logs
    return indexedChangesLogs
      .filter((it) => it.haystack.includes(debouncedSearchChanges))
      .map((it) => it.row)
  }, [indexedChangesLogs, changesLogs.logs, debouncedSearchChanges])

  const checkColumns = useMemo(() => {
    const first = checkLogs.logs[0]
    if (!first) return []
    return Object.keys(first)
  }, [checkLogs])

  const changesColumns = useMemo(() => {
    const first = changesLogs.logs[0]
    if (!first) return []
    return Object.keys(first)
  }, [changesLogs])

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-muted-foreground">Đang tải dữ liệu...</span>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-8 border-destructive/50 bg-destructive/5">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div>
            <p className="font-semibold text-destructive">Lỗi tải dữ liệu</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="glass">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">Lịch sử kiểm tra định kỳ</p>
              <p className="text-2xl font-bold text-white mt-1">{checkLogs.total_logs}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-blue-500 opacity-100" />
          </div>
        </Card>
        </div>
  
        <div className="glass">
        <Card className="p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">Lịch sử thay thế linh kiện</p>
              <p className="text-2xl font-bold text-white mt-1">{changesLogs.total_logs}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-500 opacity-100" />
            </div>
        </Card>
        </div>
      </div>

      <Card className="p-6 glass">
        <Tabs defaultValue="check" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 glass">
            <TabsTrigger value="check" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Kiểm tra định kỳ
            </TabsTrigger>
            <TabsTrigger value="changes" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Thay thế linh kiện
            </TabsTrigger>
          </TabsList>

          <TabsContent value="check" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white" />
              <Input
                placeholder="Tìm kiếm trong lịch sử kiểm tra..."
                value={searchCheck}
                onChange={(e) => setSearchCheck(e.target.value)}
                className="pl-10 text-white"
              />
            </div>

            {filteredCheckLogs.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-muted-foreground">{searchCheck ? "Không tìm thấy kết quả" : "Chưa có dữ liệu"}</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-xs whitespace-nowrap text-white">Tên thiết bị</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap text-white">Hành động</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap text-white">Chu kỳ</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap text-white">Ngày kiểm tra</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap text-white">Ghi chú</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap text-white">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCheckLogs.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/30">
                          <TableCell className="text-sm py-3 text-white">{renderValue(row?.ten_thietBi)}</TableCell>
                          <TableCell className="text-sm py-3 text-white">{renderValue(row?.action)}</TableCell>
                          <TableCell className="text-sm py-3 text-white">{renderValue(row?.chu_ky)}</TableCell>
                          <TableCell className="text-sm py-3 text-white">{renderValue(row?.new_data?.ngay_check)}</TableCell>
                          <TableCell className="text-sm py-3 text-white">{renderValue(row?.new_data?.ghi_chu)}</TableCell>
                          <TableCell className="text-sm py-3 text-white">{renderValue(row?.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="text-xs text-white">
              Hiển thị {filteredCheckLogs.length} / {checkLogs.total_logs} bản ghi
            </div>
          </TabsContent>

          <TabsContent value="changes" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white" />
              <Input
                placeholder="Tìm kiếm trong lịch sử thay thế..."
                value={searchChanges}
                onChange={(e) => setSearchChanges(e.target.value)}
                className="pl-10 text-white"
              />
            </div>

            {filteredChangesLogs.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-white mx-auto mb-2" />
                <p className="text-white">{searchChanges ? "Không tìm thấy kết quả" : "Chưa có dữ liệu"}</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-xs whitespace-nowrap text-white">Tên AMR</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap text-white">Mã linh kiện</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap text-white">Loại linh kiện</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap text-white">Hành động</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap text-white">Ngày thay thế</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap text-white">Ghi chú cũ</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap text-white">Ghi chú mới</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap text-white">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChangesLogs.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/30">
                          <TableCell className="text-sm py-3 text-white">{renderValue(row?.amr_id)}</TableCell>
                          <TableCell className="text-sm py-3">{renderValue(row?.new_data?.["Mã linh kiện"])}</TableCell>
                          <TableCell className="text-sm py-3 text-white">{renderValue(row?.new_data?.["Loại linh kiện"])}</TableCell>
                          <TableCell className="text-sm py-3 text-white">{renderValue(row?.action)}</TableCell>
                          <TableCell className="text-sm py-3 text-white">{renderValue(row?.new_data?.["Ngày update"])}</TableCell>
                          <TableCell className="text-sm py-3 text-white">{renderValue(row?.changes?.["Ghi chú"]?.old)}</TableCell>
                          <TableCell className="text-sm py-3 text-white">{renderValue(row?.changes?.["Ghi chú"]?.new)}</TableCell>
                          <TableCell className="text-sm py-3 text-white">{renderValue(row?.timestamp)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="text-xs text-white">
              Hiển thị {filteredChangesLogs.length} / {changesLogs.total_logs} bản ghi
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

// Build a lowercase haystack string from any nested object/array for fast includes() search
function buildHaystack(value) {
  const parts = []
  ;(function walk(v) {
    if (v == null) return
    const t = typeof v
    if (t === "string" || t === "number" || t === "boolean") {
      parts.push(String(v))
      return
    }
    if (Array.isArray(v)) {
      for (const item of v) walk(item)
      return
    }
    if (t === "object") {
      for (const [k, val] of Object.entries(v)) {
        parts.push(k)
        walk(val)
      }
    }
  })(value)
  return parts.join(" ").toLowerCase()
}

function formatColumnName(name) {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

function renderValue(value) {
  if (value == null) return "—"
  if (typeof value === "boolean") {
    return value ? (
      <Badge variant="default" className="bg-green-500/20 text-green-700 hover:bg-green-500/30">
        Có
      </Badge>
    ) : (
      <Badge variant="secondary">Không</Badge>
    )
  }
  if (typeof value === "number") {
    return <span className="font-mono text-sm">{value.toLocaleString("vi-VN")}</span>
  }
  if (typeof value === "object") {
    try {
      return <span className="font-mono text-xs text-muted-foreground">{JSON.stringify(value)}</span>
    } catch {
      return String(value)
    }
  }
  
  // Check if value is a date string and format it
  const dateValue = formatDateToDDMMYYYY(value)
  return dateValue
}