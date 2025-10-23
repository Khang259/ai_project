import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { } from "lucide-react"
import { getMaintainPartsSummary } from "../../services/maintain_parts_summary.js"

export function ComponentsTable({ onComponentClick }) {
  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch data từ API
  useEffect(() => {
    const fetchComponents = async () => {
      try {
        setLoading(true)
        const response = await getMaintainPartsSummary()
        
        // Map dữ liệu từ API response vào format của component
        const mappedData = response.map((item) => ({
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

    </>
  )
}

