"use client"

import { useState } from "react"
import { ComponentsTable } from "@/components/amrParts-table"
import { VehicleDetailsModal } from "@/components/amrDetail"
import { ComponentDetailsModal } from "@/components/component-details-modal"
import { Notice } from "@/components/notice"

export default function Home() {
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [selectedVehicleComponent, setSelectedVehicleComponent] = useState(null)

  return (
    <main className="min-h-screen h-screen bg-background p-3 flex flex-col">
      {/* Thông báo nhắc nhở */}
      <Notice />

      <header className="mb-3">
        <h1 className="text-2xl font-bold text-foreground mb-1">QUẢN LÝ BẢO TRÌ LINH KIỆN AMR</h1>
      </header>

      <div className="flex-1 overflow-hidden">
        <ComponentsTable onComponentClick={(maLinhKien, componentType) => {
          console.log('Home: onComponentClick called with:', { maLinhKien, componentType })
          setSelectedComponent({ maLinhKien, componentType })
        }} />
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
    </main>
  )
}

