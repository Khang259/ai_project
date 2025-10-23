"use client"

import { X, CheckCircle, FileText, StickyNote } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function ComponentDetailsModal({ amrId, componentType, onClose, componentDetails }) {
  const details = componentDetails

  if (!details) return null

  const getStatusBadge = (status) => {
    switch (status) {
      case "Tốt":
        return <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">{status}</Badge>
      case "Sắp đến hạn":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">{status}</Badge>
      case "Quá hạn":
        return <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">{status}</Badge>
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3 sm:p-4">
      <Card className="w-full max-w-2xl bg-card border-border max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">Chi tiết linh kiện</h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">{amrId}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted h-8 w-8 flex-shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Responsive grid - 1 column on mobile, 2 columns on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">AMR ID</p>
                <p className="font-mono font-semibold text-foreground text-sm sm:text-base">{details.amrId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Tên linh kiện</p>
                <p className="font-medium text-foreground text-sm sm:text-base">{details.partName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Thương hiệu</p>
                <p className="font-medium text-foreground text-sm sm:text-base">{details.brand}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Model</p>
                <p className="font-mono text-foreground text-sm sm:text-base">{details.model}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Tuổi thọ</p>
                <p className="font-medium text-foreground text-sm sm:text-base">{details.serviceLife} ngày</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Ngày lắp đặt</p>
                <p className="font-medium text-foreground text-sm sm:text-base">{details.installDate}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Bảo trì tiếp theo</p>
                <p className="font-medium text-foreground text-sm sm:text-base">{details.nextMaintenance}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Tình trạng</p>
                {getStatusBadge(details.status)}
              </div>
            </div>

            <div className="border-t border-border pt-4 sm:pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Thao tác</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
                  <CheckCircle className="mr-2 h-3.5 w-3.5" />
                  Đánh dấu đã thay
                </Button>
                <Button size="sm" variant="outline" className="border-border hover:bg-muted bg-transparent w-full sm:w-auto">
                  <StickyNote className="mr-2 h-3.5 w-3.5" />
                  Thêm ghi chú
                </Button>
                <Button size="sm" variant="outline" className="border-border hover:bg-muted bg-transparent w-full sm:w-auto">
                  <FileText className="mr-2 h-3.5 w-3.5" />
                  Xem tài liệu
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
