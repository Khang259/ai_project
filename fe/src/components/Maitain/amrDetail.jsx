"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDateToDDMMYYYY } from "@/utils/dateFormatter"

export function VehicleDetailsModal({ maLinhKien, componentType, onClose, onVehicleComponentClick }) {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateInputs, setDateInputs] = useState({}) // Lưu trữ ngày nhập cho từng AMR
  const [updating, setUpdating] = useState({}) // Track trạng thái đang update cho từng AMR

  useEffect(() => {
    if (!maLinhKien) {
      console.log('VehicleDetailsModal: maLinhKien is empty/null:', maLinhKien)
      return
    }

    const fetchVehicleData = async () => {
      try {
        setLoading(true)
        console.log('VehicleDetailsModal: maLinhKien:', maLinhKien)
        
        const { getPartDetailByAMR } = await import("@/services/part_detail")
        const data = await getPartDetailByAMR(maLinhKien)
        
        console.log('VehicleDetailsModal: API response data:', data)
        
        // Map dữ liệu từ API response
        const mappedData = data["Danh sách"].map((item) => ({
          amrId: item.amr_id || "",
          lastReplacement: item["Ngày thay gần nhất"] || "",
          daysRemaining: item["Số ngày còn lại"] || 0,
          maintenanceDate: item.ngay_bao_tri || ""
        }))
        
        console.log('VehicleDetailsModal: Mapped data:', mappedData)
        setVehicles(mappedData)
      } catch (err) {
        console.error('VehicleDetailsModal: Error fetching vehicle data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchVehicleData()
  }, [maLinhKien])

  const getStatusColor = (daysRemaining) => {
    if (daysRemaining === null || daysRemaining === undefined) {
      return "text-muted-foreground"
    }
    // Kiểm tra nếu là "Thay thế khi hỏng" - màu xanh nước biển
    if (daysRemaining === 'Thay thế khi hỏng') {
      return "text-cyan-700 font-medium" // "Thay thế khi hỏng" - màu xanh nước biển
    }
    if (daysRemaining < 0) {
      return "text-destructive font-medium" // Quá hạn - màu đỏ
    }
    if (daysRemaining < 30) {
      return "text-warning font-medium" // Sắp đến hạn - màu vàng
    }
    return "text-success font-medium" // Tốt - màu xanh lá
  }

  const handleDateChange = (amrId, date) => {
    setDateInputs(prev => ({
      ...prev,
      [amrId]: date
    }))
  }

  const handleUpdateDate = async (amrId) => {
    const newDate = dateInputs[amrId]
    
    if (!newDate) {
      alert('Vui lòng nhập ngày bảo trì')
      return
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(newDate)) {
      alert('Định dạng ngày không đúng. Vui lòng sử dụng định dạng YYYY-MM-DD')
      return
    }

    try {
      setUpdating(prev => ({ ...prev, [amrId]: true }))
      
      console.log('Updating date with payload:', { amr_id: amrId, maLinhKien, newDate })

      const { updatePartDate, getPartDetailByAMR } = await import("@/services/part_detail")
      const result = await updatePartDate(amrId, maLinhKien, newDate)
      
      console.log('Update successful:', result)
      
      // Refresh data after successful update
      const refreshData = await getPartDetailByAMR(maLinhKien)
      const mappedData = refreshData["Danh sách"].map((item) => ({
        amrId: item.amr_id || "",
        lastReplacement: item["Ngày thay gần nhất"] || "",
        daysRemaining: item["Số ngày còn lại"] || 0,
        maintenanceDate: item.ngay_bao_tri || ""
      }))
      setVehicles(mappedData)
      
      alert('Cập nhật ngày bảo trì thành công!')
      
      // Clear the input
      setDateInputs(prev => ({ ...prev, [amrId]: '' }))
      
    } catch (error) {
      console.error('Error updating date:', error)
      alert(`Lỗi khi cập nhật: ${error.message}`)
    } finally {
      setUpdating(prev => ({ ...prev, [amrId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3">
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-card border-border flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-foreground">{componentType}</h2>
              <p className="text-xs text-muted-foreground">Mã linh kiện: {maLinhKien}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Đang tải dữ liệu...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3">
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-card border-border flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-foreground">{componentType}</h2>
              <p className="text-xs text-muted-foreground">Mã linh kiện: {maLinhKien}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center h-64">
            <p className="text-destructive">Lỗi khi tải dữ liệu: {error}</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-card border-border flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">{componentType}</h2>
            <p className="text-xs text-muted-foreground">Mã linh kiện: {maLinhKien} - Danh sách AMR sử dụng linh kiện này</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 bg-card border-b border-border z-10">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">TÊN AMR</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">NGÀY BẢO TRÌ GẦN NHẤT</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">NGÀY CẦN BẢO TRÌ</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">SỐ NGÀY CÒN LẠI</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">UPDATE NGÀY BẢO TRÌ</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle, index) => (
                <tr
                  key={index}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td 
                    className="px-4 py-2.5 cursor-pointer" 
                    onClick={() => onVehicleComponentClick && onVehicleComponentClick(vehicle.amrId)}
                  >
                    <span className="font-mono font-medium text-foreground text-sm">{vehicle.amrId}</span>
                  </td>
                  <td 
                    className="px-4 py-2.5 cursor-pointer" 
                    onClick={() => onVehicleComponentClick && onVehicleComponentClick(vehicle.amrId)}
                  >
                    <span className="text-sm text-muted-foreground">
                      {vehicle.lastReplacement ? formatDateToDDMMYYYY(vehicle.lastReplacement) : "Chưa cập nhật"}
                    </span>
                  </td>
                  <td 
                    className="px-4 py-2.5 text-center cursor-pointer" 
                    onClick={() => onVehicleComponentClick && onVehicleComponentClick(vehicle.amrId)}
                  >
                    <span className="text-sm text-muted-foreground">
                      {vehicle.maintenanceDate ? formatDateToDDMMYYYY(vehicle.maintenanceDate) : "Chưa có"}
                    </span>
                  </td>
                  <td 
                    className="px-4 py-2.5 text-center cursor-pointer" 
                    onClick={() => onVehicleComponentClick && onVehicleComponentClick(vehicle.amrId)}
                  >
                    <span className={`text-sm ${getStatusColor(vehicle.daysRemaining)}`}>
                      {vehicle.daysRemaining !== null && vehicle.daysRemaining !== undefined 
                        ? vehicle.daysRemaining 
                        : "N/A"
                      }
                    </span>
                  </td>
                  
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <input
                        type="date"
                        value={dateInputs[vehicle.amrId] || ''}
                        onChange={(e) => handleDateChange(vehicle.amrId, e.target.value)}
                        className="px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="YYYY-MM-DD"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdateDate(vehicle.amrId)}
                        disabled={updating[vehicle.amrId] || !dateInputs[vehicle.amrId]}
                        className="text-xs px-2 py-1 h-7"
                      >
                        {updating[vehicle.amrId] ? 'Đang cập nhật...' : 'Xác nhận'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

