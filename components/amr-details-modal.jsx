"use client"

import { useState, useEffect } from "react"
import { X, Truck, Package, AlertCircle, Edit2, Save, X as XIcon } from "lucide-react"
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
        console.error('Error fetching AMR details:', err)
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
      ghiChu: part["Ghi chú"] || ""
    })
  }

  const handleSave = async (index) => {
    try {
      setSaving(true)
      
      // TODO: Gọi API để lưu dữ liệu
      // const response = await fetch(`/api/update-part/${amrId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     maLinhKien: editData.maLinhKien,
      //     ngayThayThe: editData.ngayThayThe,
      //     ghiChu: editData.ghiChu
      //   })
      // })

      // Cập nhật local state
      const updatedData = { ...data }
      updatedData.chi_tiet_linh_kien[index] = {
        ...updatedData.chi_tiet_linh_kien[index],
        "Mã linh kiện": editData.maLinhKien,
        "Ngày update": editData.ngayThayThe,
        "Ghi chú": editData.ghiChu
      }
      setData(updatedData)
      
      setEditingRow(null)
      setEditData({})
      
      // Hiển thị thông báo thành công
      console.log("Đã lưu thành công!")
      
    } catch (error) {
      console.error("Lỗi khi lưu:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingRow(null)
    setEditData({})
  }

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3">
        <Card className="w-full max-w-4xl bg-card border-border max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-foreground">Chi tiết linh kiện AMR</h2>
              <p className="text-xs text-muted-foreground font-mono">{amrId}</p>
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
          <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-foreground">Chi tiết linh kiện AMR</h2>
              <p className="text-xs text-muted-foreground font-mono">{amrId}</p>
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
          <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-foreground">Chi tiết linh kiện AMR</h2>
              <p className="text-xs text-muted-foreground font-mono">{amrId}</p>
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
        <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">Chi tiết linh kiện AMR</h2>
            <p className="text-xs text-muted-foreground font-mono">{amrId}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Header thông tin AMR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <Truck className="h-6 w-6" />
                  <div>
                    <p className="text-sm opacity-90">Tên AMR</p>
                    <p className="text-xl font-bold">{data.amr_id}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="h-6 w-6" />
                  <div>
                    <p className="text-sm opacity-90">Tổng số linh kiện cần thay thế</p>
                    <p className="text-xl font-bold">{data.sumPartsReplaceAMR || 0}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Bảng chi tiết linh kiện */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Danh sách linh kiện</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold whitespace-nowrap">Mã linh kiện</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Loại linh kiện</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Ngày thay thế</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Số lượng cần thay</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Days left</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Ghi chú</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.chi_tiet_linh_kien?.map((part, index) => (
                      <TableRow key={part["Mã linh kiện"] || index}>
                        {/* Mã linh kiện */}
                        <TableCell className="font-mono text-sm">
                          {editingRow === index ? (
                            <Input
                              value={editData.maLinhKien}
                              onChange={(e) => handleInputChange('maLinhKien', e.target.value)}
                              className="w-full text-sm"
                              placeholder="Nhập mã linh kiện"
                            />
                          ) : (
                            <span className="whitespace-nowrap">
                              {part["Mã linh kiện"] || "N/A"}
                            </span>
                          )}
                        </TableCell>

                        {/* Loại linh kiện */}
                        <TableCell className="whitespace-nowrap">
                          {part["Loại linh kiện"] || "N/A"}
                        </TableCell>

                        {/* Ngày thay thế */}
                        <TableCell>
                          {editingRow === index ? (
                            <Input
                              type="date"
                              value={editData.ngayThayThe}
                              onChange={(e) => handleInputChange('ngayThayThe', e.target.value)}
                              className="w-full text-sm"
                            />
                          ) : (
                            <span className="whitespace-nowrap">
                              {part["Ngày update"] || "N/A"}
                            </span>
                          )}
                        </TableCell>

                        {/* Số lượng cần thay */}
                        <TableCell className="whitespace-nowrap">
                          <Badge 
                            variant={part["Số lượng cần thay"] > 0 ? "destructive" : "secondary"}
                            className="font-semibold"
                          >
                            {part["Số lượng cần thay"] || 0}
                          </Badge>
                        </TableCell>

                        {/* Days left */}
                        <TableCell className="whitespace-nowrap">
                          <Badge 
                            variant={part["Days left"] > 0 ? "destructive" : "secondary"}
                            className="font-semibold"
                          >
                            {part["Days left"] || 0}
                          </Badge>
                        </TableCell>

                        {/* Ghi chú */}
                        <TableCell className="min-w-[200px]">
                          {editingRow === index ? (
                            <Textarea
                              value={editData.ghiChu}
                              onChange={(e) => handleInputChange('ghiChu', e.target.value)}
                              className="w-full text-sm min-h-[60px] resize-none"
                              placeholder="Nhập ghi chú..."
                            />
                          ) : (
                            <div className="max-w-[200px]">
                              <p className="text-sm text-muted-foreground break-words">
                                {part["Ghi chú"] || "Chưa có ghi chú"}
                              </p>
                            </div>
                          )}
                        </TableCell>

                        {/* Thao tác */}
                        <TableCell className="whitespace-nowrap">
                          {editingRow === index ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleSave(index)}
                                disabled={saving}
                                className="h-7 px-2 bg-green-600 hover:bg-green-700"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                className="h-7 px-2"
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

          {/* Ghi chú
          {data.ghi_chu && (
            <Card className="bg-muted/50">
              <div className="p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">{data.ghi_chu}</p>
                </div>
              </div>
            </Card>
          )} */}
        </div>
      </Card>
    </div>
  )
}
