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

  const gradientStops = [
    { start: '#daf1ff', end: '#3cb170' },   // hoàn thành 
    { start: '#facc15', end: '#f97316' },   // đang thực hiện 
    { start: '#ffa2a2', end: '#d21814' },   // thất bại 
    { start: '#4f505b', end: '#a5b2bd' },   // hủy bỏ
  ];

  const todayData = {
    labels: [t('statistics.completed'), t('statistics.inProgress'), t('statistics.failed'), t('statistics.cancelled')],
    datasets: [
      {
        data: [50, 30, 20, 10],
        backgroundColor: (context) => {
          const { chart } = context;
          const { ctx, chartArea } = chart;
          const { dataIndex } = context;
          const config = gradientStops[dataIndex % gradientStops.length];

          if (!chartArea) {
            return config.start;
          }

          const gradient = ctx.createLinearGradient(
            chartArea.left,
            chartArea.bottom,
            chartArea.right,
            chartArea.top
          );
          gradient.addColorStop(0, config.start);
          gradient.addColorStop(1, config.end);
          return gradient;
        },
        borderColor: gradientStops.map((g) => g.end),
        borderRadius: 10, // Bo góc
        spacing: 3,
      },
    ],
  };

  // const rateData = {
  //   labels: ["Completed", "Remaining"],
  //   datasets: [
  //     {
  //       data: [43, 14],
  //       backgroundColor: ["#3b82f6", "#e5e7eb"],
  //       borderWidth: 3,
  //       borderColor: "#ffffff",
  //     },
  //   ],
  // };

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


  return (
    <div className="w-full ">
      <div className="">
        {/* Today Section - Dùng Pie Chart */}
        <div className="flex flex-row">
          <div className="flex justify-center w-2/3">
            <div className="relative h-56 mb-4 mt-4">
              <Doughnut data={todayData} options={options} /> {/* Đổi thành Pie */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-bold text-white drop-shadow-md">150</span>
                {/* <span className="text-base text-white drop-shadow">{t('statistics.totalTasks')}</span> */}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-1 text-lg w-1/3 mr-3">
            {[
              { label: t('statistics.completed'), color: 'bg-green-300' },
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
      </div>
    </div>
  );
}