"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockComponents } from "@/lib/mock-data"

export function ComponentsTable({ onComponentClick }) {
  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">Loại linh kiện</th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">Mã linh kiện</th>
              <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">Tổng số</th>
              <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">Sắp đến hạn</th>
              <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">Đã thay</th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {mockComponents.map((component, index) => (
              <tr
                key={index}
                onClick={() => onComponentClick(component.type)}
                className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    <span className="font-medium text-foreground text-sm">{component.type}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className="font-mono text-sm text-muted-foreground">{component.code}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className="text-foreground font-medium text-sm">{component.total}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {component.dueSoon > 0 ? (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">
                      {component.dueSoon}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">0</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className="text-muted-foreground text-sm">{component.replaced}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">{component.note}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

