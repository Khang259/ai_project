"use client"

import { useState } from "react"
import { ComponentsTable } from "@/components/amrParts-table"
import { VehicleDetailsModal } from "@/components/amrDetail"
import { ComponentDetailsModal } from "@/components/component-details-modal"
import { Notice } from "@/components/notice"
import { MaintenanceChecklist } from "@/components/maintenance-checklist"
import { PartsReplaceOverview } from "@/components/parts-replace-overview"
import { AMRDetailsModal } from "@/components/amr-details-modal"
import { MaintenanceHistoryTable } from "@/components/maintenance-history-table"
import { ListChecks, ClipboardList, BarChart3, History } from "lucide-react"

export default function Home() {
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [selectedVehicleComponent, setSelectedVehicleComponent] = useState(null)
  const [selectedAMR, setSelectedAMR] = useState(null)
  const [activeTab, setActiveTab] = useState("list") // "list", "checklist", "overview", hoặc "history"

  return (
    <main className="min-h-screen h-screen bg-background p-3 flex flex-col">
      {/* Thông báo nhắc nhở */}
      <Notice />

      <header className="mb-3">
        <h1 className="text-2xl font-bold text-foreground mb-1">QUẢN LÝ BẢO TRÌ LINH KIỆN AMR</h1>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === "overview"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Tổng quan thay thế
          </button>
          <button
            onClick={() => setActiveTab("checklist")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === "checklist"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Checklist bảo trì
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === "list"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <ListChecks className="w-4 h-4" />
            Danh sách bảo trì
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
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

