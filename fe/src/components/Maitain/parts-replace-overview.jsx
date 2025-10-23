"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertCircle, Package, Truck, Search, ArrowUpDown, ArrowUp, ArrowDown, Edit3, Save, X } from "lucide-react"

export function PartsReplaceOverview({ onAMRClick }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("kiemTra") // "kiemTra" hoặc "thayThe"
  const [sortOrder, setSortOrder] = useState("desc") // "desc" hoặc "asc"
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAMR, setEditingAMR] = useState(null)
  const [newAMRName, setNewAMRName] = useState("")
  const [updating, setUpdating] = useState(false)

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

  // Hàm lọc và sắp xếp dữ liệu AMR
  const getFilteredAndSortedAMRs = () => {
    if (!data?.chi_tiet_theo_amr) return []

    let filteredAMRs = data.chi_tiet_theo_amr

    // Lọc theo tên AMR
    if (searchTerm.trim()) {
      filteredAMRs = filteredAMRs.filter(amr => 
        amr.amr_id?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Sắp xếp theo tiêu chí được chọn
    filteredAMRs.sort((a, b) => {
      let aCount, bCount
      
      if (sortField === "kiemTra") {
        aCount = a.sumPartsOne || 0
        bCount = b.sumPartsOne || 0
      } else if (sortField === "thayThe") {
        aCount = a.sumPartsTwo || 0
        bCount = b.sumPartsTwo || 0
      }
      
      if (sortOrder === "desc") {
        return bCount - aCount // Giảm dần
      } else {
        return aCount - bCount // Tăng dần
      }
    })
    return filteredAMRs
  }

  // Hàm thay đổi sắp xếp theo tiêu chí
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "desc" ? "asc" : "desc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  // Hàm mở modal edit AMR name
  const handleEditAMR = (amrId, event) => {
    event.stopPropagation() // Ngăn chặn click event bubble lên card
    setEditingAMR(amrId)
    setNewAMRName(amrId)
    setShowEditModal(true)
  }

  // Hàm đóng modal edit
  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingAMR(null)
    setNewAMRName("")
  }

  // Hàm cập nhật tên AMR
  const handleUpdateAMRName = async () => {
    if (!editingAMR || !newAMRName.trim()) {
      alert('Vui lòng nhập tên AMR mới')
      return
    }

    if (editingAMR === newAMRName.trim()) {
      alert('Tên AMR mới phải khác tên hiện tại')
      return
    }

    try {
      setUpdating(true)
      
      const response = await fetch('/api/amr/update-name', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          old_amr_id: editingAMR,
          new_amr_id: newAMRName.trim()
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Lỗi khi cập nhật tên AMR')
      }

      // Cập nhật dữ liệu local
      setData(prevData => {
        if (!prevData?.chi_tiet_theo_amr) return prevData
        
        const updatedAMRs = prevData.chi_tiet_theo_amr.map(amr => 
          amr.amr_id === editingAMR 
            ? { ...amr, amr_id: newAMRName.trim() }
            : amr
        )
        
        return {
          ...prevData,
          chi_tiet_theo_amr: updatedAMRs
        }
      })

      alert(`Đã cập nhật thành công tên AMR từ "${editingAMR}" thành "${newAMRName.trim()}"`)
      handleCloseEditModal()
      
    } catch (error) {
      console.error('Error updating AMR name:', error)
      alert('Lỗi khi cập nhật tên AMR: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <Package className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Linh kiện cần kiểm tra</p>
                    <p className="text-3xl font-bold text-foreground">{data.sum_parts_one || 0}</p>
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
                    <p className="text-3xl font-bold text-foreground">{data.sum_parts_two || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Chi tiết theo từng AMR</h2>

            {/* Thanh tìm kiếm và sắp xếp */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm theo tên AMR (ví dụ: amr001)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => handleSort("kiemTra")}
                variant="outline"
                className={`flex items-center gap-2 ${
                  sortField === "kiemTra" ? "bg-primary/10 border-primary" : ""
                }`}
              >
                {sortField === "kiemTra" && sortOrder === "desc" ? (
                  <ArrowDown className="h-4 w-4" />
                ) : sortField === "kiemTra" && sortOrder === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowUpDown className="h-4 w-4" />
                )}
                Kiểm tra
              </Button>
              <Button
                onClick={() => handleSort("thayThe")}
                variant="outline"
                className={`flex items-center gap-2 ${
                  sortField === "thayThe" ? "bg-primary/10 border-primary" : ""
                }`}
              >
                {sortField === "thayThe" && sortOrder === "desc" ? (
                  <ArrowDown className="h-4 w-4" />
                ) : sortField === "thayThe" && sortOrder === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowUpDown className="h-4 w-4" />
                )}
                Thay thế
              </Button>
            </div>

            {/* Hiển thị kết quả tìm kiếm */}
            {searchTerm.trim() && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Tìm thấy {getFilteredAndSortedAMRs().length} AMR phù hợp với "{searchTerm}"
                </p>
              </div>
            )}

            {getFilteredAndSortedAMRs().length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Không tìm thấy AMR nào</p>
                  <p className="text-sm">
                    {searchTerm.trim() 
                      ? `Không có AMR nào phù hợp với "${searchTerm}"`
                      : "Chưa có dữ liệu AMR"
                    }
                  </p>
                  {searchTerm.trim() && (
                    <Button
                      onClick={() => setSearchTerm("")}
                      variant="outline"
                      size="sm"
                      className="mt-4"
                    >
                      Xóa bộ lọc
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {getFilteredAndSortedAMRs().map((amr, index) => (
                  <Card
                    key={amr.amr_id || index}
                    className="hover:shadow-lg transition-all cursor-pointer hover:border-primary/50"
                    onClick={() => onAMRClick && onAMRClick(amr.amr_id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Truck className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="truncate">{amr.amr_id || `AMR ${index + 1}`}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => handleEditAMR(amr.amr_id, e)}
                          className="h-6 w-6 p-0 hover:bg-primary/10 flex-shrink-0"
                          title="Sửa tên AMR"
                        >
                          <Edit3 className="h-3 w-3 text-muted-foreground hover:text-primary" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">Kiểm tra:</span>
                        <Badge
                          variant="secondary"
                          className={`font-semibold ${
                            amr.sumPartsOne > 0
                              ? "bg-yellow-400 text-white hover:bg-yellow-300"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {amr.sumPartsOne || 0}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">Thay thế:</span>
                        <Badge
                          variant={amr.sumPartsTwo > 0 ? "destructive" : "secondary"}
                          className="font-semibold"
                        >
                          {amr.sumPartsTwo || 0}
                        </Badge>
                      </div>

                      {/* {amr.sumPartsTwo > 0 ? (
                        <div className="text-xs font-medium text-destructive bg-destructive/5 p-2 rounded border border-destructive/20">
                          🔴 Cần thay thế
                        </div>
                      ) : (
                        amr.sumPartsOne > 0 ? (
                          <div className="text-xs font-medium text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                            ⚠️ Cần kiểm tra
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-green-700 bg-green-50 p-2 rounded border border-green-200">
                            ✓ Hoạt động tốt
                          </div>
                        )
                      )} */}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit AMR Name Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              Sửa tên AMR
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="current-name" className="text-right text-sm font-medium">
                Tên hiện tại:
              </label>
              <span className="col-span-3 font-mono text-sm bg-muted p-2 rounded">
                {editingAMR}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="new-name" className="text-right text-sm font-medium">
                Tên mới:
              </label>
              <div className="col-span-3">
                <Input
                  id="new-name"
                  placeholder="Nhập tên AMR mới..."
                  value={newAMRName}
                  onChange={(e) => setNewAMRName(e.target.value)}
                  className="font-mono"
                  disabled={updating}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={handleCloseEditModal}
              disabled={updating}
            >
              <X className="h-4 w-4 mr-1" />
              Hủy
            </Button>
            <Button 
              onClick={handleUpdateAMRName}
              disabled={updating || !newAMRName.trim() || newAMRName.trim() === editingAMR}
            >
              {updating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                  Đang cập nhật...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Cập nhật
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
