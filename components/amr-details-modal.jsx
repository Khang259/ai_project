"use client"

import { useState, useEffect } from "react"
import { X, Truck, Package, AlertCircle, Edit2, Save, XIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function AMRDetailsModal({ amrId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingRow, setEditingRow] = useState(null)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!amrId) return

    const fetchAMRDetails = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/sum-parts-replace/${encodeURIComponent(amrId)}`)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error("Error fetching AMR details:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAMRDetails()
  }, [amrId])

  const handleEdit = (index, part) => {
    setEditingRow(index)
    setEditData({
      maLinhKien: part["Mã linh kiện"] || "",
      ngayThayThe: part["Ngày update"] || "",
      ghiChu: part["Ghi chú"] || "",
    })
  }

  const handleSave = async (index) => {
    try {
      setSaving(true)

      const response = await fetch("/api/part/update-with-log", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amr_id: amrId,
          ma_linh_kien: editData.maLinhKien,
          ngay_thay_the: editData.ngayThayThe,
          ghi_chu: editData.ghiChu,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Lỗi khi lưu dữ liệu")
      }

      const result = await response.json()

      const updatedData = { ...data }
      updatedData.chi_tiet_linh_kien[index] = {
        ...updatedData.chi_tiet_linh_kien[index],
        "Mã linh kiện": editData.maLinhKien,
        "Ngày update": editData.ngayThayThe,
        "Ghi chú": editData.ghiChu,
      }
      setData(updatedData)

      setEditingRow(null)
      setEditData({})

      console.log("Đã lưu thành công!", result)
    } catch (error) {
      console.error("Lỗi khi lưu:", error)
      alert(`Lỗi: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingRow(null)
    setEditData({})
  }

  const handleInputChange = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3">
        <Card className="w-full max-w-4xl bg-card border-border max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Chi tiết linh kiện AMR</h2>
              <p className="text-xs text-muted-foreground font-mono mt-1">{amrId}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3">
        <Card className="w-full max-w-4xl bg-card border-border max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Chi tiết linh kiện AMR</h2>
              <p className="text-xs text-muted-foreground font-mono mt-1">{amrId}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="font-medium text-destructive">Lỗi tải dữ liệu</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3">
        <Card className="w-full max-w-4xl bg-card border-border max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Chi tiết linh kiện AMR</h2>
              <p className="text-xs text-muted-foreground font-mono mt-1">{amrId}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-muted-foreground">Không có dữ liệu</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3">
      <Card className="w-full max-w-4xl bg-card border-border max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Chi tiết linh kiện AMR</h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">{amrId}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tên AMR</p>
                <p className="text-base font-semibold text-foreground">{data.amr_id}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Package className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng linh kiện cần thay</p>
                <p className="text-base font-semibold text-foreground">{data.sumPartsReplaceAMR || 0}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Danh sách linh kiện</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs whitespace-nowrap">Mã linh kiện</TableHead>
                      <TableHead className="font-semibold text-xs whitespace-nowrap">Loại</TableHead>
                      <TableHead className="font-semibold text-xs whitespace-nowrap">Ngày thay thế</TableHead>
                      <TableHead className="font-semibold text-xs whitespace-nowrap">Số lượng</TableHead>
                      <TableHead className="font-semibold text-xs whitespace-nowrap">Ghi chú</TableHead>
                      <TableHead className="font-semibold text-xs whitespace-nowrap">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.chi_tiet_linh_kien?.map((part, index) => (
                      <TableRow key={part["Mã linh kiện"] || index} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs py-3">
                          {editingRow === index ? (
                            <Input
                              value={editData.maLinhKien}
                              onChange={(e) => handleInputChange("maLinhKien", e.target.value)}
                              className="w-full text-xs h-8"
                              placeholder="Mã linh kiện"
                            />
                          ) : (
                            <span className="whitespace-nowrap">{part["Mã linh kiện"] || "N/A"}</span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs py-3 whitespace-nowrap">
                          {part["Loại linh kiện"] || "N/A"}
                        </TableCell>

                        <TableCell className="text-xs py-3">
                          {editingRow === index ? (
                            <Input
                              type="date"
                              value={editData.ngayThayThe}
                              onChange={(e) => handleInputChange("ngayThayThe", e.target.value)}
                              className="w-full text-xs h-8"
                            />
                          ) : (
                            <span className="whitespace-nowrap">{part["Ngày update"] || "N/A"}</span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs py-3">
                          <Badge
                            variant={part["Số lượng cần thay"] > 0 ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {part["Số lượng cần thay"] || 0}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-xs py-3 max-w-[150px]">
                          {editingRow === index ? (
                            <Textarea
                              value={editData.ghiChu}
                              onChange={(e) => handleInputChange("ghiChu", e.target.value)}
                              className="w-full text-xs min-h-[50px] resize-none"
                              placeholder="Ghi chú..."
                            />
                          ) : (
                            <p className="text-muted-foreground break-words line-clamp-2">{part["Ghi chú"] || "—"}</p>
                          )}
                        </TableCell>

                        <TableCell className="text-xs py-3 whitespace-nowrap">
                          {editingRow === index ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleSave(index)}
                                disabled={saving}
                                className="h-7 px-2 text-xs"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                className="h-7 px-2 bg-transparent"
                              >
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(index, part)}
                              className="h-7 px-2"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
