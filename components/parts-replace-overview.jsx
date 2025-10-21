"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Package, Truck } from "lucide-react"

export function PartsReplaceOverview({ onAMRClick }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/sum-parts-replace-all")

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error("Error fetching parts replace data:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Lỗi tải dữ liệu</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Không có dữ liệu</p>
      </div>
    )
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Tổng số AMR</p>
                    <p className="text-3xl font-bold text-foreground">{data.sum_amr || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-destructive">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <Package className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Linh kiện cần thay thế</p>
                    <p className="text-3xl font-bold text-foreground">{data.sum_parts_replace || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Chi tiết theo từng AMR</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {data.chi_tiet_theo_amr?.map((amr, index) => (
                <Card
                  key={amr.amr_id || index}
                  className="hover:shadow-lg transition-all cursor-pointer hover:border-primary/50"
                  onClick={() => onAMRClick && onAMRClick(amr.amr_id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" />
                      <span className="truncate">{amr.amr_id || `AMR ${index + 1}`}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Cần thay:</span>
                      <Badge
                        variant={amr.sumPartsReplaceAMR > 0 ? "destructive" : "secondary"}
                        className="font-semibold"
                      >
                        {amr.sumPartsReplaceAMR || 0}
                      </Badge>
                    </div>

                    {amr.sumPartsReplaceAMR > 0 ? (
                      <div className="text-xs font-medium text-destructive bg-destructive/5 p-2 rounded border border-destructive/20">
                        ⚠️ Cần kiểm tra
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-green-700 bg-green-50 p-2 rounded border border-green-200">
                        ✓ Hoạt động tốt
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
