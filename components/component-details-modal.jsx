"use client"

import { X, CheckCircle, FileText, StickyNote } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { mockComponentDetails } from "@/lib/mock-data"

export function ComponentDetailsModal({ amrId, componentType, onClose }) {
  const details = mockComponentDetails.find((d) => d.amrId === amrId && d.partName === componentType)

  if (!details) return null

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
      <Card className="w-full max-w-2xl bg-card border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Chi tiết linh kiện</h2>
            <p className="text-xs text-muted-foreground font-mono">{amrId}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">AMR ID</p>
              <p className="font-mono font-semibold text-foreground text-sm">{details.amrId}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Tên linh kiện</p>
              <p className="font-medium text-foreground text-sm">{details.partName}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Thương hiệu</p>
              <p className="font-medium text-foreground text-sm">{details.brand}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Model</p>
              <p className="font-mono text-foreground text-sm">{details.model}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Tuổi thọ</p>
              <p className="font-medium text-foreground text-sm">{details.serviceLife} ngày</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Ngày lắp đặt</p>
              <p className="font-medium text-foreground text-sm">{details.installDate}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Bảo trì tiếp theo</p>
              <p className="font-medium text-foreground text-sm">{details.nextMaintenance}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Tình trạng</p>
              {getStatusBadge(details.status)}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Thao tác</h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="bg-success hover:bg-success/90 text-white">
                <CheckCircle className="mr-2 h-3.5 w-3.5" />
                Đánh dấu đã thay
              </Button>
              <Button size="sm" variant="outline" className="border-border hover:bg-muted bg-transparent">
                <StickyNote className="mr-2 h-3.5 w-3.5" />
                Thêm ghi chú
              </Button>
              <Button size="sm" variant="outline" className="border-border hover:bg-muted bg-transparent">
                <FileText className="mr-2 h-3.5 w-3.5" />
                Xem tài liệu
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

