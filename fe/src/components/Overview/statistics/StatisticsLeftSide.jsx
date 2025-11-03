import {Doughnut } from "react-chartjs-2"; // Đổi thành Pie
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useTranslation } from 'react-i18next';
import { Card, Typography, Tag } from 'antd';

ChartJS.register(ArcElement, Tooltip, Legend);

const { Title } = Typography;
export default function StatisticsLeftSide() {
  const { t } = useTranslation();

  const todayData = {
    labels: [t('statistics.completed'), t('statistics.inProgress'), t('statistics.failed'), t('statistics.cancelled')],
    datasets: [
      {
        data: [10, 20, 40, 50],
        backgroundColor: [
          "#3b82f6",
          "#facc15",
          "#ef4444",
          "#d1d5db",
        ],
        // borderWidth: 3,
         borderColor: [
          "#3b82f6",
          "#facc15",
          "#ef4444",
          "#d1d5db",
        ],
        borderRadius: 10, // Bo góc
        spacing: 3,
      },
    ],
  };

  const rateData = {
    labels: ["Completed", "Remaining"],
    datasets: [
      {
        data: [43, 14],
        backgroundColor: ["#3b82f6", "#e5e7eb"],
        borderWidth: 3,
        borderColor: "#ffffff",
      },
    ],
  };

  const options = {
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: 'white',
        bodyColor: 'white',
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
    },
  };

  // 2 chart nhỏ vẫn dùng Doughnut (hoặc đổi thành Pie nếu muốn)
  const smallOptions = { ...options };

  return (
    <div className="w-full h-full ">
      <Title level={1} 
        style={{ 
          fontWeight: 700, 
          fontSize: 32, 
          paddingLeft: 24, 
          paddingRight: 24, 
          color: 'white' }}>
        {t('statistics.statistics')}
      </Title>
      <div className="glass w-full h-[815px] p-4">
        {/* Today Section - Dùng Pie Chart */}
        <div className="mb-6">
          <h1 className="text-lg font-medium mb-2 text-white">{t('statistics.today')}</h1>
          
          <div className="flex justify-center mb-4 mt-4">
            <div className="relative w-56 h-56">
              <Doughnut data={todayData} options={options} /> {/* Đổi thành Pie */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-white drop-shadow-md">150</span>
                <span className="text-base text-white drop-shadow">{t('statistics.totalTasks')}</span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-16 text-sm">
            {[
              { label: t('statistics.completed'), color: 'bg-blue-500' },
              { label: t('statistics.inProgress'), color: 'bg-yellow-400' },
              { label: t('statistics.failed'), color: 'bg-red-500' },
              { label: t('statistics.cancelled'), color: 'bg-gray-300' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-3 h-3 ${item.color} inline-block rounded-sm`}></span>
                <span className="text-white">{item.label}</span>
                <span className="text-white ml-auto">
                  {Math.round((todayData.datasets[0].data[i] / 120) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Completion Rate - Vẫn dùng Doughnut (hoặc đổi thành Pie) */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: t('statistics.last7Days'), percent: 75 },
              { title: t('statistics.last30Days'), percent: 75 },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <h1 className="text-lg font-medium mb-2 text-white">{item.title}</h1>
                <div className="relative w-24 h-24">
                  <Doughnut data={rateData} options={smallOptions} /> {/* Giữ Doughnut */}
                  <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-blue-600">
                    {item.percent}%
                  </div>
                </div>
                <p className="text-xs mt-1 text-gray-500">
                  <span className="text-white">{t('statistics.completed')}</span> <span className="text-white">43</span> / 
                  <span className="text-white ml-1">{t('statistics.total')}</span> <span className="text-white">57</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Device Overview */}
        <div>
          <h1 className="text-lg font-medium mb-2 text-white">{t('statistics.deviceOverview')}</h1>
          <div className="flex justify-around text-center text-xs">
            <div>
              <div className="text-xl font-semibold text-white">1</div>
              <div className="text-white flex items-center justify-center gap-1">
                <img src="/src/assets/robotic_ic.png" alt="Robot" className="w-7 h-7" />
                <span className="text-white">{t('statistics.totalDevices')}</span>
              </div>
            </div>
            <div>
              <div className="text-xl font-semibold text-white">0%</div>
              <div className="text-white flex items-center justify-center gap-1">
                <img src="/src/assets/battery_ic.png" alt="Battery" className="w-7 h-7" />
                <span className="text-white">{t('statistics.averageBattery')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}