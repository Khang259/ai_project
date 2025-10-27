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
    <div
      className="w-[100%] h-[105%] rounded-lg shadow-xl p-6 pt-8 overflow-y-auto glass"
    >
      <h2 className="text-lg font-semibold mb-4">Thống kê</h2>

      {/* Today Section */}
      <div className="mb-6">
        <h1 className="text-lg font-large mb-2">Hôm nay</h1>
        
        {/* Main Doughnut Chart */}
        <div className="flex justify-center mb-4 mt-4 ">
          <div className="relative align-center w-50 h-50">
            <Doughnut data={todayData} options={options} />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700">
              <span className="text-3xl font-bold">150</span>
              <span className="text-base">Tổng nhiệm vụ</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-y-4 gap-x-16 text-md">
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
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center">
          <h1 className="text-lg font-large mb-2">7 ngày gần nhất</h1>
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
          <h1 className="text-lg font-large mb-2">30 ngày gần nhất</h1>
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
        <h1 className="text-lg font-large mb-2">Tổng quan thiết bị</h1>
        <div className="flex justify-around text-center text-xs">
          <div>
            <div className="text-xl font-semibold">1</div>
            <div className="text-gray-500 flex items-center justify-center gap-1">
              <img src="/src/assets/robotic_ic.png" alt="Battery" className="w-7 h-7" />
              Số lượng thiết bị
            </div>
          </div>
          <div>
            <div className="text-xl font-semibold">0%</div>
            <div className="text-gray-500 flex items-center justify-center gap-1">
              <img src="/src/assets/battery_ic.png" alt="Battery" className="w-7 h-7" />
              Pin trung bình
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
