"use client"

import { X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { mockVehicleComponents } from "@/lib/mock-data"

export function VehicleDetailsModal({ componentType, onClose, onVehicleComponentClick }) {
  const vehicles = mockVehicleComponents.filter((v) => v.componentType === componentType)

  const getStatusBadge = (status) => {
    switch (status) {
      case "Tốt":
        return <Badge className="bg-success/10 text-success border-success/20 text-xs">{status}</Badge>
      case "Sắp đến hạn":
        return <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">{status}</Badge>
      case "Quá hạn":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">{status}</Badge>
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-card border-border flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">{componentType}</h2>
            <p className="text-xs text-muted-foreground">Danh sách xe sử dụng linh kiện này</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 bg-card border-b border-border z-10">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">Tên AMR</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">Ngày thay gần nhất</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">Còn lại (ngày)</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">Tình trạng</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle, index) => (
                <tr
                  key={index}
                  onClick={() => onVehicleComponentClick(vehicle.amrId)}
                  className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <span className="font-mono font-medium text-foreground text-sm">{vehicle.amrId}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-sm text-muted-foreground">{vehicle.lastReplacement}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="font-medium text-foreground text-sm">{vehicle.daysRemaining}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center">{getStatusBadge(vehicle.status)}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-sm text-muted-foreground">{vehicle.note}</span>
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


