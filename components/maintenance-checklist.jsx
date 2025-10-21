"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react"

export function MaintenanceChecklist() {
  const [maintenanceData, setMaintenanceData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState({}) // Track updating status for each device

  // Fetch data từ API
  useEffect(() => {
    const fetchMaintenanceData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/maintenance-check')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Phân chia data theo chu_ky và sắp xếp trong từng nhóm
        const groupedData = data.reduce((acc, item) => {
          const chuKy = item.chu_ky || 'khác'
          if (!acc[chuKy]) {
            acc[chuKy] = []
          }
          acc[chuKy].push(item)
          return acc
        }, {})
        
        // Sắp xếp thiết bị trong từng nhóm theo tên
        Object.keys(groupedData).forEach(chuKy => {
          groupedData[chuKy].sort((a, b) => a.ten_thietBi.localeCompare(b.ten_thietBi))
        })
        
        setMaintenanceData(groupedData)
      } catch (err) {
        console.error('Error fetching maintenance data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMaintenanceData()
  }, [])

  // Function to update device status
  const handleUpdateStatus = async (idThietBi, newStatus) => {
    try {
      setUpdating(prev => ({ ...prev, [idThietBi]: true }))
      
      const response = await fetch('/api/maintenance-check/update-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_thietBi: idThietBi,
          trang_thai: newStatus,
          ngay_check: newStatus === 'done' ? new Date().toISOString().split('T')[0] : undefined
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Update local state
      setMaintenanceData(prevData => {
        const newData = { ...prevData }
        Object.keys(newData).forEach(chuKy => {
          newData[chuKy] = newData[chuKy].map(item => 
            item.id_thietBi === idThietBi 
              ? { 
                  ...item, 
                  trang_thai: newStatus, 
                  ngay_check: newStatus === 'done' ? new Date().toISOString().split('T')[0] : item.ngay_check
                }
              : item
          )
        })
        return newData
      })

    } catch (err) {
      console.error('Error updating status:', err)
      alert('Lỗi khi cập nhật trạng thái: ' + err.message)
    } finally {
      setUpdating(prev => ({ ...prev, [idThietBi]: false }))
    }
  }

  // Function to handle icon click with confirmation
  const handleIconClick = (item) => {
    const isDone = item.trang_thai === 'done'
    const action = isDone ? 'Reset trạng thái' : 'Đã kiểm tra'
    const confirmMessage = isDone 
      ? `Bạn có chắc muốn reset trạng thái cho "${item.ten_thietBi}"?`
      : `Bạn có chắc đã kiểm tra "${item.ten_thietBi}"?`
    
    if (window.confirm(confirmMessage)) {
      const newStatus = isDone ? 'not' : 'done'
      handleUpdateStatus(item.id_thietBi, newStatus)
    }
  }

  // Mapping chu kỳ và styling
  const chuKyConfig = {
    'ngày': {
      period: "Bảo trì thiết bị theo ngày",
      icon: <Calendar className="w-5 h-5" />,
      color: "bg-blue-500/10 border-blue-500/20 text-blue-600",
      note: 'Xem hướng dẫn chi tiết cách kiểm tra định kỳ theo ngày trong file "Hướng dẫn kiểm tra định kỳ", mục 4.2'
    },
    'tuần': {
      period: "Bảo trì thiết bị theo tuần", 
      icon: <Calendar className="w-5 h-5" />,
      color: "bg-green-500/10 border-green-500/20 text-green-600",
      note: 'Xem hướng dẫn chi tiết cách kiểm tra định kỳ theo tuần trong file "Hướng dẫn kiểm tra định kỳ", mục 4.3'
    },
    'tháng': {
      period: "Bảo trì thiết bị theo tháng",
      icon: <Clock className="w-5 h-5" />,
      color: "bg-orange-500/10 border-orange-500/20 text-orange-600", 
      note: 'Xem hướng dẫn chi tiết cách kiểm tra định kỳ theo tháng trong file "Hướng dẫn kiểm tra định kỳ", mục 4.4'
    },
    'năm': {
      period: "Bảo trì thiết bị theo năm",
      icon: <Clock className="w-5 h-5" />,
      color: "bg-purple-500/10 border-purple-500/20 text-purple-600",
      note: 'Xem hướng dẫn chi tiết cách kiểm tra định kỳ theo năm trong file "Hướng dẫn kiểm tra định kỳ", mục 4.5'
    },
    'khác': {
      period: "Bảo trì thiết bị khác",
      icon: <FileText className="w-5 h-5" />,
      color: "bg-gray-500/10 border-gray-500/20 text-gray-600",
      note: 'Các thiết bị có chu kỳ bảo trì đặc biệt'
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <Card className="bg-card border-border h-full flex flex-col">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Đang tải dữ liệu bảo trì...</p>
          </div>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <Card className="bg-card border-border h-full flex flex-col">
          <div className="flex items-center justify-center h-64">
            <p className="text-destructive">Lỗi khi tải dữ liệu: {error}</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Card className="bg-card border-border h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Nội dung bảo trì</h2>
              <p className="text-sm text-muted-foreground">Danh sách thiết bị cần kiểm tra định kỳ</p>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="space-y-6">
            {Object.entries(maintenanceData).map(([chuKy, items], sectionIndex) => {
              const config = chuKyConfig[chuKy] || chuKyConfig['khác']
              return (
                <div key={chuKy} className="space-y-3">
                  {/* Section Header */}
                  <div className="px-4 py-3 bg-muted/30 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-base text-foreground">
                        {sectionIndex + 1}. {config.period}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        ({items.length} thiết bị)
                      </span>
                    </div>
                  </div>

                  {/* Items List - Vertical */}
                  <div className="space-y-1">
                    {items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-3 p-3 bg-card border border-border rounded">
                        {/* Index Number */}
                        <span className="flex-shrink-0 w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                          {itemIndex + 1}
                        </span>
                        
                        {/* Device Name */}
                        <span className="flex-1 text-foreground font-medium">
                          {item.ten_thietBi}
                        </span>
                        
                        {/* Ngày kiểm tra */}
                        <span className="text-sm text-muted-foreground min-w-[100px] text-center">
                          {item.ngay_check || 'Chưa có'}
                        </span>
                        
                        {/* Status Icon - Clickable */}
                        <div 
                          className="flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => !updating[item.id_thietBi] && handleIconClick(item)}
                          title={item.trang_thai === 'done' ? 'Click để reset trạng thái' : 'Click để xác nhận đã kiểm tra'}
                        >
                          {updating[item.id_thietBi] ? (
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : item.trang_thai === 'done' ? (
                            <CheckCircle className="w-4 h-4 text-green-600 hover:text-green-700" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-orange-600 hover:text-orange-700" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-8 p-4 rounded bg-muted/30 text-center text-base font-medium" style={{ color: "#1e40af" }}>
            Xem hướng dẫn bảo trì chi tiết trong file <b style={{ color: "#1e40af" }}>Hướng dẫn bảo trì AMR</b> (chương IV).
          </div>
        </div>
      </Card>
    </div>
  )
}

