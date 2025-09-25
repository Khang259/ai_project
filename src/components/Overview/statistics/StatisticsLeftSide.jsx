import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StatisticsLeftSide() {
  const todayData = {
    labels: ["Completed", "In progress", "Not Start", "Failed", "Cancelled"],
    datasets: [
      {
        data: [10, 20, 30, 40, 50],
        backgroundColor: [
          "#3b82f6", // blue (completed)
          "#facc15", // yellow (in progress)
          "#a78bfa", // purple (not start)
          "#ef4444", // red (failed)
          "#d1d5db", // gray (cancelled)
        ],
        borderWidth: 1,
      },
    ],
  };

  const rateData = {
    labels: ["Completed", "Remaining"],
    datasets: [
      {
        data: [43, 14], // 43 done / 57 total
        backgroundColor: ["#3b82f6", "#e5e7eb"],
      },
    ],
  };

  const options = {
    plugins: { legend: { display: false } },
    cutout: "70%",
  };

  return (
    <div className="w-[100%] rounded-lg bg-white border border-gray-200 p-6 pt-8 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Statistics</h2>

      {/* Today Section */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2">Today</h3>
        
        {/* Main Doughnut Chart */}
        <div className="flex justify-center mb-4">
          <div className="relative w-40 h-40">
            <Doughnut data={todayData} options={options} />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700">
              <span className="text-2xl font-bold">150</span>
              <span className="text-sm">Total</span>
            </div>
          </div>
        </div>

        {/* Additional Circular Progress Charts */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="flex flex-col items-center">
            <div className="relative w-16 h-16">
              <Doughnut 
                data={{
                  labels: ["Completed", "Remaining"],
                  datasets: [{
                    data: [0, 100],
                    backgroundColor: ["#3b82f6", "#e5e7eb"],
                    borderWidth: 0
                  }]
                }} 
                options={{
                  plugins: { legend: { display: false } },
                  cutout: "75%"
                }} 
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">
                0%
              </div>
            </div>
            <p className="text-xs mt-1 text-gray-500 text-center">Completed</p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="relative w-16 h-16">
              <Doughnut 
                data={{
                  labels: ["In Progress", "Remaining"],
                  datasets: [{
                    data: [0, 100],
                    backgroundColor: ["#facc15", "#e5e7eb"],
                    borderWidth: 0
                  }]
                }} 
                options={{
                  plugins: { legend: { display: false } },
                  cutout: "75%"
                }} 
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-yellow-600">
                0%
              </div>
            </div>
            <p className="text-xs mt-1 text-gray-500 text-center">In Progress</p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="relative w-16 h-16">
              <Doughnut 
                data={{
                  labels: ["Failed", "Remaining"],
                  datasets: [{
                    data: [0, 100],
                    backgroundColor: ["#ef4444", "#e5e7eb"],
                    borderWidth: 0
                  }]
                }} 
                options={{
                  plugins: { legend: { display: false } },
                  cutout: "75%"
                }} 
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-red-600">
                0%
              </div>
            </div>
            <p className="text-xs mt-1 text-gray-500 text-center">Failed</p>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 inline-block rounded-sm"></span>
            Completed 0%
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-400 inline-block rounded-sm"></span>
            In progress 0%
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-purple-400 inline-block rounded-sm"></span>
            Not Start 0%
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 inline-block rounded-sm"></span>
            Failed 0%
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-gray-300 inline-block rounded-sm"></span>
            Cancelled 0%
          </div>
        </div>
      </div>

      {/* Task Completion Rate */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2">Task Completion Rate</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24">
              <Doughnut data={rateData} options={options} />
              <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-blue-600">
                75%
              </div>
            </div>
            <p className="text-xs mt-1 text-gray-500">
              Completed 43 / Total 57
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24">
              <Doughnut data={rateData} options={options} />
              <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-blue-600">
                75%
              </div>
            </div>
            <p className="text-xs mt-1 text-gray-500">
              Completed 43 / Total 57
            </p>
          </div>
        </div>
      </div>

      {/* Device Overview */}
      <div>
        <h3 className="text-sm font-medium mb-2">Device Overview</h3>
        <div className="flex justify-around text-center text-xs">
          <div>
            <div className="text-lg font-semibold">1</div>
            <div className="text-gray-500">Device number</div>
          </div>
          <div>
            <div className="text-lg font-semibold">0%</div>
            <div className="text-gray-500">Average battery</div>
          </div>
        </div>
      </div>
    </div>
  )
}
