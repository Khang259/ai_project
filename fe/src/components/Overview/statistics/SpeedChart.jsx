// src/components/SpeedChart.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { useSpeedChart } from '@/hooks/Dashboard/useSpeedChart';

// Định nghĩa màu cho các group
const GROUP_CONFIG = {
  "Tốc độ": '#a855f7',
};

// Hàm lấy màu cho group
const getGroupColor = (groupKey) => {
  if (GROUP_CONFIG[groupKey]) {
    return GROUP_CONFIG[groupKey];
  }
  // Random màu cho các group không định nghĩa trước
  const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
  return randomColor;
};

const formatBattery = (value) => `${Math.round(Number(value) || 0)}%`;

const SpeedChart = () => {
  const { t } = useTranslation();
  const data = useSpeedChart();

  const getLegendName = (groupKey) => {
    if (groupKey === 'Tốc độ') return t('statistics.speedChartLegendLabel');
    return groupKey;
  };

  // Tự động lấy danh sách group keys từ data
  const getGroupKeys = () => {
    if (!data || data.length === 0) return [];
    const keys = Object.keys(data[0]).filter(key => key !== 'gio');
    return keys;
  };

  const groupKeys = getGroupKeys();

  return (
    <div
      className="h-full flex flex-col min-h-0 px-2 py-1.5 lg:px-3 lg:py-2 xl:px-3 fullhd:px-4 fullhd:py-3"
      style={{
        width: '100%',
        borderRadius: '16px',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
        fontFamily: 'Arial, sans-serif',
        color: '#e2e8f0',
      }}
    >
      <h2
        className="shrink-0"
        style={{
          textAlign: 'left',
          color: '#ffffff',
          fontSize: 'clamp(0.9rem, 1.8vw, 1.5rem)',
          fontWeight: 'bold',
          paddingBottom: '4px',
        }}
      >
        {t('statistics.speedChartTitle')}
      </h2>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 50, left: 12, bottom: 8 }}>
          {/* Lưới nền trong suốt hơn */}
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

          {/* Trục X */}
          <XAxis
            type="number"
            // domain={[0, 2]}: Điểm bắt đầu là 0, điểm kết thúc cố định là 2
            domain={[0, 2]} 
            // ticks: Xác định các vạch chia cụ thể nếu bạn muốn (ví dụ 0, 0.5, 1, 1.5, 2)
            ticks={[0, 0.5, 1, 1.5, 2]}
            tick={{ fill: '#cbd5e1', fontSize: 14 }}
            axisLine={{ stroke: '#475569' }}
          />

          {/* Trục Y */}
          <YAxis
            dataKey="gio"
            type="category"
            tick={{ fill: '#cbd5e1', fontSize: 14 }}
            axisLine={{ stroke: '#475569' }}
            width={80}
          />

          {/* Tooltip */}
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#f1f5f9',
            }}
            labelStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
            formatter={(value) => formatBattery(value)}
          />

          {/* Legend */}
          <Legend
            wrapperStyle={{ paddingTop: '8px', color: '#e2e8f0' }}
            iconType="rect"
            iconSize={14}
          />

          {/* Dynamic render cho tất cả các group */}
          {groupKeys.reverse().map((groupKey) => {
            const color = getGroupColor(groupKey);
            return (
              // Trong hàm map
              <Bar
                key={groupKey}
                dataKey={groupKey}
                stackId="a"
                fill={color}
                radius={[0, 0, 0, 0]}
                name={getLegendName(groupKey)}
              >
                {/* Thêm nhãn % vào đây */}
                <LabelList
                  dataKey={groupKey}
                  position="right" // Đặt ở giữa mỗi đoạn cột chồng
                  fill="#fff"       // Chữ trắng để nổi bật trên nền màu cột
                  fontSize={16}
                  fontWeight="bold"
                  formatter={(value) => value > 0 ? `${value} m/s` : ''}
                />
              </Bar>
              
            );
          })}
          
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SpeedChart;