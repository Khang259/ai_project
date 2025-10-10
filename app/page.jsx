"use client"

import { useState } from "react"
import { ComponentsTable } from "@/components/components-table"
import { VehicleDetailsModal } from "@/components/vehicle-details-modal"
import { ComponentDetailsModal } from "@/components/component-details-modal"

export default function Home() {
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [selectedVehicleComponent, setSelectedVehicleComponent] = useState(null)

  return (
    <main className="min-h-screen h-screen bg-background p-3 flex flex-col">
      <header className="mb-3">
        <h1 className="text-2xl font-bold text-foreground mb-1">QUẢN LÝ BẢO TRÌ LINH KIỆN AMR</h1>
      </header>

      <div className="flex-1 overflow-hidden">
        <ComponentsTable onComponentClick={(componentType) => setSelectedComponent(componentType)} />
      </div>

      {selectedComponent && (
        <VehicleDetailsModal
          componentType={selectedComponent}
          onClose={() => setSelectedComponent(null)}
          onVehicleComponentClick={(amrId) => setSelectedVehicleComponent({ amrId, componentType: selectedComponent })}
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

