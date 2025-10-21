"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, History } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MaintenanceHistoryTable() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/maintenance-logs')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setLogs(data.logs || [])
      } else {
        throw new Error(data.error || 'Không thể tải dữ liệu logs')
      }
    } catch (err) {
      console.error('Error fetching maintenance logs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-'
    try {
      const date = new Date(timestamp)
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return timestamp
    }
  }

  const getActionBadgeVariant = (action) => {
    switch (action) {
      case 'Thay thế linh kiện':
        return 'default'
      case 'Kiểm tra':
        return 'secondary'
      case 'Bảo trì':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Lịch sử thay thế / kiểm tra linh kiện
          </CardTitle>
          
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải dữ liệu...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Lịch sử thay thế / kiểm tra linh kiện
          </CardTitle>
          
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-center text-muted-foreground">
            <p className="text-red-500 mb-2">Lỗi khi tải dữ liệu:</p>
            <p className="text-sm">{error}</p>
          </div>
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Thử lại
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Lịch sử thay thế / kiểm tra linh kiện
            </CardTitle>
            
          </div>
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có dữ liệu lịch sử thay thế</p>
              <p className="text-sm">Dữ liệu sẽ xuất hiện khi có hoạt động thay thế linh kiện</p>
            </div>
          </div>
        ) : (
          <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Tên AMR</TableHead>
                  <TableHead className="w-[140px]">Hành động</TableHead>
                  <TableHead className="w-[120px]">Mã linh kiện</TableHead>
                  <TableHead className="w-[150px]">Loại</TableHead>
                  <TableHead className="w-[100px]">Số lượng</TableHead>
                  <TableHead className="w-[140px]">Ngày thay thế</TableHead>
                  <TableHead className="min-w-[200px]">Ghi chú</TableHead>
                  <TableHead className="w-[160px]">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {log.amr_id || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log["Mã linh kiện"] || '-'}
                    </TableCell>
                    <TableCell>
                      {log["Loại linh kiện"] || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {log["Số lượng/ AMR"] || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(log["Ngày update"])}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={log["Ghi chú"]}>
                      {log["Ghi chú"] || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
