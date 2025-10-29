"use client"

import { useState, useEffect } from "react"
import { X, Truck, Package, AlertCircle, Edit2, Save, XIcon, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSumPartsReplaceByAMR, updatePartWithLog } from "@/services/amr_detail"
import { formatDateToDDMMYYYY } from "@/utils/dateFormatter"

export function AMRDetailsModal({ amrId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingRow, setEditingRow] = useState(null)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState(null) // "ngayThayThe", "kiemTra" hoặc "thayThe"
  const [sortOrder, setSortOrder] = useState("desc") // "desc" hoặc "asc"

  useEffect(() => {
    if (!amrId) return

    const fetchAMRDetails = async () => {
      try {
        setLoading(true)
        const result = await getSumPartsReplaceByAMR(amrId)
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

  // Hàm lọc và sắp xếp dữ liệu linh kiện
  const getFilteredAndSortedParts = () => {
    if (!data?.chi_tiet_linh_kien) return []

    let filteredParts = data.chi_tiet_linh_kien

    // Lọc theo mã linh kiện và loại linh kiện
    if (searchTerm.trim()) {
      filteredParts = filteredParts.filter(part => {
        const maLinhKien = part["Mã linh kiện"]?.toLowerCase() || ""
        const loaiLinhKien = part["Loại linh kiện"]?.toLowerCase() || ""
        const searchLower = searchTerm.toLowerCase()
        
        return maLinhKien.includes(searchLower) || loaiLinhKien.includes(searchLower)
      })
    }

    // Sắp xếp theo trường được chọn
    if (sortField) {
      filteredParts.sort((a, b) => {
        let aValue, bValue

        if (sortField === "ngayThayThe") {
          aValue = new Date(a["Ngày update"] || "1900-01-01")
          bValue = new Date(b["Ngày update"] || "1900-01-01")
        } else if (sortField === "kiemTra") {
          aValue = a["Số lượng cần kiểm tra"] || 0
          bValue = b["Số lượng cần kiểm tra"] || 0
        } else if (sortField === "thayThe") {
          aValue = a["Số lượng cần thay"] || 0
          bValue = b["Số lượng cần thay"] || 0
        }

        if (sortOrder === "desc") {
          return bValue > aValue ? 1 : bValue < aValue ? -1 : 0
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        }
      })
    }

    return filteredParts
  }

  // Hàm thay đổi sắp xếp
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "desc" ? "asc" : "desc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  // Hàm lấy icon sắp xếp cho cột
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />
    }
    return sortOrder === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
  }

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

      const result = await updatePartWithLog(
        amrId,
        editData.maLinhKien,
        editData.ngayThayThe,
        editData.ghiChu
      )

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="p-2 bg-yellow-600/10 rounded-lg">
                <Package className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng linh kiện cần kiểm tra</p>
                <p className="text-base font-semibold text-foreground">{data.sumPartsOne || 0}</p>
              </div>
              
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Package className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng linh kiện cần thay thế</p>
                <p className="text-base font-semibold text-foreground">{data.sumPartsTwo || 0}</p>
              </div>
              
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Danh sách linh kiện</h3>
              
              {/* Thanh tìm kiếm */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tìm theo mã/loại linh kiện..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-8 text-xs"
                />
              </div>
            </div>

            {/* Hiển thị kết quả tìm kiếm */}
            {searchTerm.trim() && (
              <div className="mb-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                Tìm thấy {getFilteredAndSortedParts().length} linh kiện phù hợp với "{searchTerm}"
              </div>
            )}

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs whitespace-nowrap">Mã linh kiện</TableHead>
                      <TableHead className="font-semibold text-xs whitespace-nowrap">Loại</TableHead>
                      <TableHead className="font-semibold text-xs whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("ngayThayThe")}
                          className="h-auto p-0 font-semibold text-xs hover:bg-transparent"
                        >
                          Ngày thay thế
                          {getSortIcon("ngayThayThe")}
                        </Button>
                      </TableHead>
                      <TableHead className="font-semibold text-xs whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("kiemTra")}
                          className="h-auto p-0 font-semibold text-xs hover:bg-transparent"
                        >
                          Kiểm tra
                          {getSortIcon("kiemTra")}
                        </Button>
                      </TableHead>
                      <TableHead className="font-semibold text-xs whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("thayThe")}
                          className="h-auto p-0 font-semibold text-xs hover:bg-transparent"
                        >
                          Thay thế
                          {getSortIcon("thayThe")}
                        </Button>
                      </TableHead>
                      <TableHead className="font-semibold text-xs whitespace-nowrap">Ghi chú</TableHead>
                      <TableHead className="font-semibold text-xs whitespace-nowrap">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredAndSortedParts().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="h-8 w-8 opacity-50" />
                            <p className="text-sm">
                              {searchTerm.trim() 
                                ? `Không tìm thấy linh kiện nào phù hợp với "${searchTerm}"`
                                : "Chưa có dữ liệu linh kiện"
                              }
                            </p>
                            {searchTerm.trim() && (
                              <Button
                                onClick={() => setSearchTerm("")}
                                variant="outline"
                                size="sm"
                                className="mt-2"
                              >
                                Xóa bộ lọc
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      getFilteredAndSortedParts().map((part, index) => (
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
                            <span className="whitespace-nowrap">{part["Ngày update"] ? formatDateToDDMMYYYY(part["Ngày update"]) : "N/A"}</span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs py-3">
                          <Badge
                            variant={part["Số lượng cần kiểm tra"] > 0 ? "warning " : "secondary"}
                            className={`text-xs ${
                              part["Số lượng cần kiểm tra"] > 0
                                ? "bg-yellow-500 text-white hover:bg-yellow-200"
                                : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {part["Số lượng cần kiểm tra"] || 0}
                          </Badge>
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
                      ))
                    )}
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