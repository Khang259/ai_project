
import AMRWarehouseMap from "@/components/Overview/map/AMRWarehouseMap/AMRWarehouseMap"
import StatisticsLeftSide from "@/components/Overview/statistics/StatisticsLeftSide"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-row h-[calc(100vh-4rem)]">
        <div className="w-[25%] p-6 ">
          <StatisticsLeftSide />
        </div>
        {/* Main map area - 75% */}
        <div className="w-[75%] bg-gray-50 p-6">
          <div className="space-y-6">
            <div className="rounded-lg shadow-sm">
              <AMRWarehouseMap />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
