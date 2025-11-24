"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Calendar, Clock, CheckCircle, AlertCircle, Edit3, Download, X } from "lucide-react"
import { getMaintenanceCheck, updateMaintenanceStatus, checkMaintenanceWithNotes } from "../../services/maintenance_check.js"
import { formatDateToDDMMYYYY } from "@/utils/dateFormatter"
import api from "@/services/api"

export function MaintenanceChecklist() {
  const [maintenanceData, setMaintenanceData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState({}) // Track updating status for each device
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [notes, setNotes] = useState("")
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [selectedPdf, setSelectedPdf] = useState(null)

  // Fetch data từ API
  useEffect(() => {
    const fetchMaintenanceData = async () => {
      try {
        setLoading(true)
        const data = await getMaintenanceCheck()
        
        // Phân chia data theo chu_ky và sắp xếp trong từng nhóm
        const groupedData = data.reduce((acc, item) => {
          const chuKy = item.chu_ky || 'khác'
          if (!acc[chuKy]) {
            acc[chuKy] = []
          }
          acc[chuKy].push(item)
          return acc
        }, {})
        
        // Sắp xếp thiết bị trong từng nhóm theo tên
        Object.keys(groupedData).forEach(chuKy => {
          groupedData[chuKy].sort((a, b) => a.ten_thietBi.localeCompare(b.ten_thietBi))
        })
        
        setMaintenanceData(groupedData)
      } catch (err) {
        console.error('Error fetching maintenance data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMaintenanceData()
  }, [])

  // Function to update device status
  const handleUpdateStatus = async (idThietBi, newStatus) => {
    try {
      setUpdating(prev => ({ ...prev, [idThietBi]: true }))
      
      const ngayCheck = newStatus === 'done' ? new Date().toISOString().split('T')[0] : null
      await updateMaintenanceStatus(idThietBi, newStatus, ngayCheck)

      // Update local state
      setMaintenanceData(prevData => {
        const newData = { ...prevData }
        Object.keys(newData).forEach(chuKy => {
          newData[chuKy] = newData[chuKy].map(item => 
            item.id_thietBi === idThietBi 
              ? { 
                  ...item, 
                  trang_thai: newStatus, 
                  ngay_check: newStatus === 'done' ? new Date().toISOString().split('T')[0] : item.ngay_check
                }
              : item
          )
        })
        return newData
      })

    } catch (err) {
      console.error('Error updating status:', err)
      alert('Lỗi khi cập nhật trạng thái: ' + err.message)
    } finally {
      setUpdating(prev => ({ ...prev, [idThietBi]: false }))
    }
  }

  // Function to handle icon click with confirmation
  const handleIconClick = (item) => {
    const isDone = item.trang_thai === 'done'
    const action = isDone ? 'Reset trạng thái' : 'Đã kiểm tra'
    const confirmMessage = isDone 
      ? `Bạn có chắc muốn reset trạng thái cho "${item.ten_thietBi}"?`
      : `Bạn có chắc đã kiểm tra "${item.ten_thietBi}"?`
    
    if (window.confirm(confirmMessage)) {
      const newStatus = isDone ? 'pending' : 'done'
      handleUpdateStatus(item.id_thietBi, newStatus)
    }
  }

  // Function to handle check with notes
  const handleCheckWithNotes = async (idThietBi, notes) => {
    try {
      setUpdating(prev => ({ ...prev, [idThietBi]: true }))
      
      const result = await checkMaintenanceWithNotes(idThietBi, notes)

      // Update local state
      setMaintenanceData(prevData => {
        const newData = { ...prevData }
        Object.keys(newData).forEach(chuKy => {
          newData[chuKy] = newData[chuKy].map(item => 
            item.id_thietBi === idThietBi 
              ? { 
                  ...item, 
                  trang_thai: 'done',
                  ngay_check: result.new_data.ngay_check,
                  ghi_chu: result.new_data.ghi_chu
                }
              : item
          )
        })
        return newData
      })

      // Close modal and reset notes
      setShowNotesModal(false)
      setNotes("")
      setSelectedDevice(null)

    } catch (err) {
      console.error('Error checking with notes:', err)
      alert('Lỗi khi kiểm tra với ghi chú: ' + err.message)
    } finally {
      setUpdating(prev => ({ ...prev, [idThietBi]: false }))
    }
  }

  // Function to open notes modal
  const openNotesModal = (item) => {
    setSelectedDevice(item)
    setNotes(item.ghi_chu || "")
    setShowNotesModal(true)
  }

  // PDF handling functions
  const handleOpenPdf = (pdfName) => {
    setSelectedPdf(pdfName)
    setShowPdfViewer(true)
  }

  const handleClosePdfViewer = () => {
    setShowPdfViewer(false)
    setSelectedPdf(null)
  }

  // Mapping chu kỳ và styling
  const chuKyConfig = {
    'ngày': {
      period: "Bảo trì thiết bị theo ngày",
      icon: <Calendar className="w-5 h-5" />,
      color: "bg-blue-500/10 border-blue-500/20 text-blue-600",
      note: 'Xem hướng dẫn chi tiết cách kiểm tra định kỳ theo ngày trong file "Hướng dẫn kiểm tra định kỳ", mục 4.2'
    },
    'tuần': {
      period: "Bảo trì thiết bị theo tuần", 
      icon: <Calendar className="w-5 h-5" />,
      color: "bg-green-500/10 border-green-500/20 text-green-600",
      note: 'Xem hướng dẫn chi tiết cách kiểm tra định kỳ theo tuần trong file "Hướng dẫn kiểm tra định kỳ", mục 4.3'
    },
    'tháng': {
      period: "Bảo trì thiết bị theo tháng",
      icon: <Clock className="w-5 h-5" />,
      color: "bg-orange-500/10 border-orange-500/20 text-orange-600", 
      note: 'Xem hướng dẫn chi tiết cách kiểm tra định kỳ theo tháng trong file "Hướng dẫn kiểm tra định kỳ", mục 4.4'
    },
    'năm': {
      period: "Bảo trì thiết bị theo năm",
      icon: <Clock className="w-5 h-5" />,
      color: "bg-purple-500/10 border-purple-500/20 text-purple-600",
      note: 'Xem hướng dẫn chi tiết cách kiểm tra định kỳ theo năm trong file "Hướng dẫn kiểm tra định kỳ", mục 4.5'
    },
    'khác': {
      period: "Bảo trì thiết bị khác",
      icon: <FileText className="w-5 h-5" />,
      color: "bg-gray-500/10 border-gray-500/20 text-gray-600",
      note: 'Các thiết bị có chu kỳ bảo trì đặc biệt'
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <Card className="bg-card border-border h-full flex flex-col">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Đang tải dữ liệu bảo trì...</p>
          </div>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <Card className="bg-card border-border h-full flex flex-col">
          <div className="flex items-center justify-center h-64">
            <p className="text-destructive">Lỗi khi tải dữ liệu: {error}</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Card className="bg-card border-border h-full flex flex-col glass">
        {/* Header */}
        <div className="border-b border-border px-6 py-4" style={{ backgroundColor: "" }}>
          <div className="flex items-center justify-between" >
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-2 rounded-lg" style={{ backgroundColor: "rgba(255, 255, 255, 1)" }}>
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="text-white">
                <h2 className="text-xl font-bold text-white">Nội dung bảo trì</h2>
                <p className="text-sm text-muted-foreground">Danh sách thiết bị cần kiểm tra định kỳ</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenPdf('taiLieuBaoTri.pdf')}
                className="text-xs"
              >
                <FileText className="w-3 h-3 mr-1" />
                Hướng dẫn bảo trì AMR
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenPdf('linhKien.pdf')}
                className="text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Chi tiết linh kiện
              </Button>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="space-y-6">
            {Object.entries(maintenanceData).map(([chuKy, items], sectionIndex) => {
              const config = chuKyConfig[chuKy] || chuKyConfig['khác']
              return (
                <div key={chuKy} className="space-y-4">
                  {/* Section Header */}
                  <div className="px-4 py-3 bg-muted/30 border border-border rounded-lg">
                    <div className="flex items-center gap-3 ">
                      <h3 className="font-semibold text-base text-white">
                        {sectionIndex + 1}. {config.period}
                      </h3>
                      <span className="text-sm text-white">
                        ({items.length} thiết bị)
                      </span>
                    </div>
                  </div>

                  {/* Items List - Vertical */}
                  <div className="space-y-2">
                    {items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-3 p-3 ml-6 mr-6 glass">
                        {/* Index Number */}
                        <span className="flex-shrink-0 w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                          {itemIndex + 1}
                        </span>
                        
                        {/* Device Name */}
                        <span className="flex-1 text-white font-medium">
                          {item.ten_thietBi}
                        </span>
                        
                        {/* Ngày kiểm tra */}
                        <span className="text-sm text-white min-w-[100px] text-center">
                          {item.ngay_check ? formatDateToDDMMYYYY(item.ngay_check) : 'Chưa có'}
                        </span>
                        
                        {/* Ghi chú */}
                        <span className="text-sm text-white min-w-[150px] truncate">
                          {item.ghi_chu || 'Chưa có'}
                        </span>
                        
                        {/* Action Icons */}
                        <div className="flex items-center gap-2">
                          {/* Check with Notes Icon */}
                          {item.trang_thai !== 'done' && (
                            <div 
                              className="flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                              onClick={() => !updating[item.id_thietBi] && openNotesModal(item)}
                              title="Kiểm tra với ghi chú"
                            >
                              <Edit3 className="w-4 h-4 text-blue-600 hover:text-blue-700" />
                            </div>
                          )}
                          
                          {/* Status Icon - Clickable */}
                          <div 
                            className="flex-shrink-0 cursor-pointer hover:scale-110 transition-transform hover:text-green-500 hover:bg-green-500/10 rounded-full p-2"
                            onClick={() => !updating[item.id_thietBi] && handleIconClick(item)}
                            title={item.trang_thai === 'done' ? 'Click để reset trạng thái' : 'Click để xác nhận đã kiểm tra'}
                          >
                            {updating[item.id_thietBi] ? (
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : item.trang_thai === 'done' ? (
                              <CheckCircle className="w-5 h-5 text-green-500 hover:text-green-700" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-orange-600 hover:text-orange-700" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-8 p-4 rounded bg-muted/30 text-center text-base font-bold text-white">
            Xem hướng dẫn bảo trì chi tiết trong file Hướng dẫn bảo trì AMR (chương IV).
          </div>
        </div>
      </Card>

      {/* Notes Modal */}
      <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Kiểm tra thiết bị với ghi chú</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="device-name" className="text-right">
                Thiết bị:
              </label>
              <span className="col-span-3 font-medium">
                {selectedDevice?.ten_thietBi}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="notes" className="text-right">
                Ghi chú:
              </label>
              <div className="col-span-3">
                <Textarea
                  id="notes"
                  placeholder="Nhập ghi chú kiểm tra..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNotesModal(false)
                setNotes("")
                setSelectedDevice(null)
              }}
            >
              Hủy
            </Button>
            <Button 
              onClick={() => {
                if (selectedDevice && notes.trim()) {
                  handleCheckWithNotes(selectedDevice.id_thietBi, notes.trim())
                } else {
                  alert('Vui lòng nhập ghi chú')
                }
              }}
              disabled={!notes.trim() || updating[selectedDevice?.id_thietBi]}
            >
              {updating[selectedDevice?.id_thietBi] ? 'Đang xử lý...' : 'Xác nhận kiểm tra'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Modal */}
      {showPdfViewer && (
        <PdfViewerModal
          pdfName={selectedPdf}
          onClose={handleClosePdfViewer}
        />
      )}
    </div>
  )
}

// PDF Viewer Modal Component - Native Browser PDF Viewer
function PdfViewerModal({ pdfName, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Sử dụng base URL từ API config
  const baseURL = api.defaults.baseURL || "http://192.168.1.6:8001"
  const pdfUrl = `${baseURL}/api/pdf/${pdfName}`

  const handleLoad = () => {
    setLoading(false)
  }

  const handleError = () => {
    setLoading(false)
    setError('Không thể tải tài liệu PDF')
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = pdfName === 'taiLieuBaoTri.pdf' 
      ? 'taiLieuBaoTri.pdf' 
      : 'linhKien.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="w-full h-full bg-card flex flex-col">
        {/* Header - Compact for fullscreen */}
        <div className="flex items-center justify-between border-b border-border px-6 py-2 flex-shrink-0 bg-muted/50">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">
                {pdfName === 'taiLieuBaoTri.pdf' ? 'Tài liệu bảo trì' : 'Danh sách linh kiện'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              className="text-xs"
            >
              <Download className="w-4 h-4 mr-1" />
              Tải xuống
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClose} 
              className="text-xs"
            >
              <X className="w-4 h-4 mr-1" />
              Đóng
            </Button>
          </div>
        </div>

        {/* PDF Content - Fullscreen Native Browser Viewer */}
        <div className="flex-1 relative overflow-hidden bg-muted/30">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Đang tải tài liệu...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center">
                <p className="text-destructive text-lg mb-2">{error}</p>
                <Button variant="outline" onClick={onClose}>Đóng</Button>
              </div>
            </div>
          )}

          {/* Native browser PDF viewer - Fullscreen mode */}
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            onLoad={handleLoad}
            onError={handleError}
            title="PDF Viewer"
            type="application/pdf"
          />
        </div>
      </div>
    </div>
  )
}
