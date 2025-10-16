"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Download, X } from "lucide-react"

export function ComponentsTable({ onComponentClick }) {
  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [selectedPdf, setSelectedPdf] = useState(null)

  // Fetch data từ API
  useEffect(() => {
    const fetchComponents = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/parts-summary')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Map dữ liệu từ API response vào format của component
        const mappedData = data.map((item) => ({
          type: item["Loại linh kiện"] || "",
          code: item["Mã linh kiện"] || "",
          lifespan: item["Tuổi thọ"] || "Không xác định",  // Thêm trường tuổi thọ
          total: item["Tổng số"] || 0,
          dueSoon: item["Số lượng sắp đến hạn"] ?? 0,  // Giữ nguyên giá trị, có thể là số hoặc string
          replaceWhenBroken: item["Số lượng thay thế khi hỏng"] || 0,
          replaced: 0, // Không có trong API, set default
          note: "" // Không có trong API, set default
        }))
        
        setComponents(mappedData)
      } catch (err) {
        console.error('Error fetching components:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchComponents()
  }, [])

  const handleOpenPdf = (pdfName) => {
    setSelectedPdf(pdfName)
    setShowPdfViewer(true)
  }

  const handleClosePdfViewer = () => {
    setShowPdfViewer(false)
    setSelectedPdf(null)
  }

  if (loading) {
    return (
      <Card className="bg-card border-border h-full flex flex-col">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-border h-full flex flex-col">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Lỗi khi tải dữ liệu: {error}</p>
        </div>
      </Card>
    )
  }
  return (
    <>
      {/* <Card className="bg-card border-border h-full flex flex-col"> */}
      <Card className="bg-card border-border h-full flex flex-col pt-0">

        {/* PDF Viewer Section */}
        <div className="border-b border-border px-4 py-2 bg-muted/30">
          <div className="flex items-center">
            {/* <h3 className="text-sm font-semibold text-foreground">Tài liệu hướng dẫn</h3> */}
            <div className="flex-1"></div>
            <div className="flex gap-2 justify-end">
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

        <div className="overflow-auto flex-1 pt-0">
        <table className="w-full mt-0">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">LOẠI LINH KIỆN</th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">MÃ LINH KIỆN</th>
              <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">TỔNG SỐ</th>
              <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">SỐ LƯỢNG SẮP ĐẾN HẠN</th>
              <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">TUỔI THỌ</th>
            </tr>
          </thead>
          <tbody>
            {components.map((component, index) => (
              <tr
                key={index}
                onClick={() => {
                  console.log('ComponentsTable: Row clicked with:', { 
                    code: component.code, 
                    type: component.type 
                  })
                  onComponentClick(component.code, component.type)
                }}
                className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {/* <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" /> */}
                    <span className="font-medium text-foreground text-sm">{component.type}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                <code className="font-medium tracking-wide text-sm px-2 py-0.5 ">{component.code}</code>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className="text-foreground font-medium text-sm">{component.total}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {component.dueSoon === "Thay thế khi hỏng" ? (
                    // Trường hợp "Thay thế khi hỏng" - màu tím
                    <Badge variant="outline" className="bg-cyan-700/10 text-cyan-700 border-cyan-700/20 text-xs">
                      Thay thế khi hỏng
                    </Badge>
                  ) : typeof component.dueSoon === 'number' && component.dueSoon > 0 ? (
                    component.replaceWhenBroken > 0 ? (
                      // Có linh kiện "Thay thế khi hỏng" và có sắp đến hạn theo thời gian - màu xanh nước biển
                      <Badge variant="outline" className="bg-cyan-700/10 text-cyan-700 border-cyan-700/20 text-xs">
                        {component.dueSoon}
                      </Badge>
                    ) : (
                      // Chỉ có linh kiện sắp đến hạn thông thường - màu vàng
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">
                        {component.dueSoon}
                      </Badge>
                    )
                  ) : (
                    <span className="text-muted-foreground text-sm">0</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className="text-foreground font-medium text-sm">{component.lifespan}</span>
                </td>
                {/* <td className="px-4 py-2.5 text-center">
                  <span className="text-muted-foreground text-sm">{component.replaced}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">{component.note}</span>
                </td> */}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      {/* PDF Viewer Modal */}
      {showPdfViewer && (
        <PdfViewerModal
          pdfName={selectedPdf}
          onClose={handleClosePdfViewer}
        />
      )}
    </>
  )
}

// PDF Viewer Modal Component - Native Browser PDF Viewer
function PdfViewerModal({ pdfName, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const pdfUrl = `/api/pdf/${pdfName}`

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

