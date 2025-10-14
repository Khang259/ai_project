"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function VehicleDetailsModal({ maLinhKien, componentType, onClose, onVehicleComponentClick }) {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!maLinhKien) {
      console.log('VehicleDetailsModal: maLinhKien is empty/null:', maLinhKien)
      return
    }

    const fetchVehicleData = async () => {
      try {
        setLoading(true)
        const url = `/api/part/${encodeURIComponent(maLinhKien)}/amr`
        console.log('VehicleDetailsModal: Fetching URL:', url)
        console.log('VehicleDetailsModal: maLinhKien:', maLinhKien)
        
        const response = await fetch(url)
        
        if (!response.ok) {
          console.error('VehicleDetailsModal: API response not ok:', response.status, response.statusText)
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('VehicleDetailsModal: API response data:', data)
        
        // Map dữ liệu từ API response
        const mappedData = data["Danh sách"].map((item) => ({
          amrId: item.amr_id || "",
          lastReplacement: item["Ngày thay gần nhất"] || "",
          daysRemaining: item["Số ngày còn lại"] || 0
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
    if (daysRemaining < 0) {
      return "text-destructive font-medium" // Quá hạn
    }
    if (daysRemaining < 30) {
      return "text-warning font-medium" // Sắp đến hạn
    }
    return "text-success font-medium" // Tốt
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
                <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">NGÀY THAY GẦN NHẤT</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">SỐ NGÀY CÒN LẠI</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle, index) => (
                <tr
                  key={index}
                  onClick={() => onVehicleComponentClick && onVehicleComponentClick(vehicle.amrId)}
                  className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <span className="font-mono font-medium text-foreground text-sm">{vehicle.amrId}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-sm text-muted-foreground">
                      {vehicle.lastReplacement || "Chưa cập nhật"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-sm ${getStatusColor(vehicle.daysRemaining)}`}>
                      {vehicle.daysRemaining !== null && vehicle.daysRemaining !== undefined 
                        ? vehicle.daysRemaining 
                        : "N/A"
                      }
                    </span>
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


