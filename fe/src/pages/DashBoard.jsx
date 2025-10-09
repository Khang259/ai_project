
import AMRWarehouseMap from "@/components/Overview/map/AMRWarehouseMap/AMRWarehouseMap"


export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white"> 
      <div className="flex">
        <div className="w-[100%] bg-gray-50 pt-1">
          <div className="space-y-6">
            <div className="rounded-lg overflow-hidden shadow-md">
              <AMRWarehouseMap />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}