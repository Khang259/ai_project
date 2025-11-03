import { useState } from "react"
import { ComponentsTable } from "@/components/Maitain/amrParts-table"
import { VehicleDetailsModal } from "@/components/Maitain/amrDetail"
import { ComponentDetailsModal } from "@/components/Maitain/component-details-modal"
import { Notice } from "@/components/Maitain/notice"
import { MaintenanceChecklist } from "@/components/Maitain/maintenance-checklist"
import { PartsReplaceOverview } from "@/components/Maitain/parts-replace-overview"
import { AMRDetailsModal } from "@/components/Maitain/amr-details-modal"
import MaintenanceHistoryTable from "@/components/Maitain/maintenance-history-table"
import { ListChecks, ClipboardList, BarChart3, History } from "lucide-react"

export default function Home() {
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [selectedVehicleComponent, setSelectedVehicleComponent] = useState(null)
  const [selectedAMR, setSelectedAMR] = useState(null)
  
  // Load activeTab từ localStorage, mặc định là "overview"
  const [activeTab, setActiveTabState] = useState(() => {
    const savedTab = localStorage.getItem('maintainActiveTab')
    return savedTab || "overview"
  })

  // Lưu activeTab vào localStorage mỗi khi thay đổi
  const setActiveTab = (tab) => {
    setActiveTabState(tab)
    localStorage.setItem('maintainActiveTab', tab)
  }

  return (
    <main className="min-h-screen h-screen p-3 flex flex-col overflow-hidden">
      {/* Thông báo nhắc nhở */}
      <Notice />

      <header className="m-4">
        <h1 className="text-2xl font-bold text-white mb-1">QUẢN LÝ BẢO TRÌ LINH KIỆN AMR</h1>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setActiveTab("overview")}
            className={`glass flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === "overview"
                ? "glass-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Tổng quan thay thế
          </button>
          <button
            onClick={() => setActiveTab("checklist")}
            className={`glass flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === "checklist"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Checklist bảo trì
          </button>
          {/* <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === "list"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <ListChecks className="w-4 h-4" />
            Danh sách bảo trì
          </button> */}
          <button
            onClick={() => setActiveTab("history")}
            className={`glass flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === "history"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <History className="w-4 h-4" />
            Lịch sử thay thế
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {activeTab === "overview" ? (
          <PartsReplaceOverview onAMRClick={(amrId) => setSelectedAMR(amrId)} />
        ) : activeTab === "list" ? (
          <ComponentsTable onComponentClick={(maLinhKien, componentType) => {
            console.log('Home: onComponentClick called with:', { maLinhKien, componentType })
            setSelectedComponent({ maLinhKien, componentType })
          }} />
        ) : activeTab === "history" ? (
          <MaintenanceHistoryTable />
        ) : (
          <MaintenanceChecklist />
        )}
      </div>

      {selectedComponent && (
        <VehicleDetailsModal
          maLinhKien={selectedComponent.maLinhKien}
          componentType={selectedComponent.componentType}
          onClose={() => setSelectedComponent(null)}
          onVehicleComponentClick={(amrId) => 
            setSelectedVehicleComponent({ 
              amrId, 
              componentType: selectedComponent.componentType 
            })
          }
        />
      )}

      {selectedVehicleComponent && (
        <ComponentDetailsModal
          amrId={selectedVehicleComponent.amrId}
          componentType={selectedVehicleComponent.componentType}
          onClose={() => setSelectedVehicleComponent(null)}
        />
      )}

      {selectedAMR && (
        <AMRDetailsModal
          amrId={selectedAMR}
          onClose={() => setSelectedAMR(null)}
        />
      )}
    </main>
  )
}
