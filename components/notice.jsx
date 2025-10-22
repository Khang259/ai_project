"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function Notice() {
  const [showPopup, setShowPopup] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [hasUnread, setHasUnread] = useState(false)

  // Hiển thị popup mỗi 10 phút
  useEffect(() => {
    // Hiển thị ngay khi component mount
    const showInitialNotification = () => {
      setShowPopup(true)
      setNotificationCount(prev => prev + 10)
      setHasUnread(true)
      
      // Tự động ẩn popup sau 10 giây
      setTimeout(() => {
        setShowPopup(false)
      }, 10000)
    }

    // Hiển thị thông báo đầu tiên sau 2 giây
    const initialTimeout = setTimeout(showInitialNotification, 2000)

    // Thiết lập interval để hiển thị mỗi 1 phút (60000ms)
    const intervalId = setInterval(() => {
      setShowPopup(true)
      setNotificationCount(prev => prev + 1)
      setHasUnread(true)
      
      // Tự động ẩn popup sau 10 giây
      setTimeout(() => {
        setShowPopup(false)
      }, 10000)
    }, 60000) // 1 phút = 60000ms

    // Cleanup
    return () => {
      clearTimeout(initialTimeout)
      clearInterval(intervalId)
    }
  }, [])

  const handleIconClick = () => {
    setShowDetail(true)
    setHasUnread(false)
    setShowPopup(false)
  }

  const handleCloseDetail = () => {
    setShowDetail(false)
  }

  const handleClosePopup = () => {
    setShowPopup(false)
  }

  return (
    <>
      {/* Icon thông báo cố định */}
      <div className="fixed top-4 right-4 z-40">
        <button
          onClick={handleIconClick}
          className="relative p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg transition-all hover:scale-110"
          aria-label="Thông báo"
        >
          <Bell className="w-4 h-4" />
          {hasUnread && (
            <Badge 
              className="absolute -top-0.5 -right-0.5 h-3 w-3 flex items-center justify-center p-0 bg-destructive text-destructive-foreground"
            >
              {notificationCount}
            </Badge>
          )}
        </button>
      </div>

      {/* Popup nhắc nhở tự động - hiển thị dưới góc phải */}
      {showPopup && (
        <div className="fixed bottom-6 right-4 z-40 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-card border-2 border-warning rounded-lg shadow-2xl p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 bg-warning/20 p-2 rounded-full">
                <Bell className="w-5 h-5 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground mb-1">
                  Nhắc nhở kiểm tra hàng ngày
                </h3>
              </div>
              <button
                onClick={handleClosePopup}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết khi click vào icon */}
      {showDetail && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-warning/20 p-2 rounded-full">
                  <Bell className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Nhắc nhở kiểm tra hàng ngày
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Thông báo an toàn hệ thống
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseDetail}
                className="hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-5 mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 bg-warning text-warning-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm mt-0.5">
                    !
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg mb-2">
                      Kiểm tra an toàn hệ thống
                    </h3>
                    <p className="text-foreground leading-relaxed">
                      Khi hệ thống tắt và khởi động lại, các hạng mục an toàn sau đây phải được kiểm tra thường xuyên 
                      <span className="font-semibold"> (ít nhất một lần mỗi 24 giờ đối với các hệ thống đang hoạt động liên tục)</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Danh sách kiểm tra (có thể mở rộng thêm) */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground mb-3">
                  Các hạng mục cần kiểm tra:
                </h4>
                
                <div className="space-y-2">
                  {[
                    "Kiểm tra máy Laser",
                    "Kiểm tra Bumper",
                    "Kiểm tra thân AMR",
                    "Kiểm tra pin và nguồn điện",
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-sm text-foreground flex-1">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm ">
                  <span className="font-semibold text-red-600">Ghi chú:</span> Xem hướng dẫn chi tiết cách kiểm tra định kỳ hằng
                  trong file  <span className="font-semibold ">"Hướng dẫn kiểm tra định kỳ"</span>, mục 4.2
                </p>
              </div>
            </div>

            {/* Footer
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleCloseDetail}
              >
                Đã hiểu
              </Button>
              <Button
                onClick={handleCloseDetail}
                className="bg-primary hover:bg-primary/90"
              >
                Xác nhận đã kiểm tra
              </Button>
            </div> */}
          </div>
        </div>
      )}
    </>
  )
}

