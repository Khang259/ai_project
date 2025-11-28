// src/components/LineChart.jsx
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useLineChart } from '@/hooks/Dashboard/useLineChart';

// Định nghĩa màu và style cho các group
const GROUP_CONFIG = {
  Group_AE: { color: '#3b82f6', activeColor: '#1d4ed8' },
  Group_DCC: { color: '#10b981', activeColor: '#059669' },
  Group_KD: { color: '#f59e0b', activeColor: '#d97706' },
  Group_MS: { color: '#ef4444', activeColor: '#dc2626' },
};

// Hàm lấy màu cho group
const getGroupColor = (groupKey) => {
  if (GROUP_CONFIG[groupKey]) {
    return GROUP_CONFIG[groupKey];
  }
  // Random màu cho các group không định nghĩa trước
  const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
  return { color: randomColor, activeColor: randomColor };
};

const LineChartComponent = () => {
  const data = useLineChart();

  const formatBattery = (value) => `${Math.round(Number(value) || 0)}%`;

  // Tự động lấy danh sách group keys từ data
  const getGroupKeys = () => {
    if (!data || data.length === 0) return [];
    const keys = Object.keys(data[0]).filter(key => key !== 'thang');
    return keys;
  };

  const groupKeys = getGroupKeys();

  return (
    <div
      style={{
        width: '600px',
        margin: '0px 10px 0px 10px',
        fontFamily: 'Arial, sans-serif',
        color: '#e2e8f0',
      }}
    >
      <h2
        style={{
          textAlign: 'left',
          marginBottom: '24px',
          color: '#ffffff',
          fontSize: '26px',
          fontWeight: 'bold',
        }}
      >
        Biểu đồ đường
      </h2>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={data}
          // margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke="#334155" />

          <XAxis
            dataKey="thang"
            tick={{ fill: '#cbd5e1', fontSize: 14 }}
            axisLine={{ stroke: '#475569' }}
          />

          <YAxis
            tickFormatter={formatBattery}
            tick={{ fill: '#cbd5e1', fontSize: 14 }}
            axisLine={{ stroke: '#475569' }}
          />

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

          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />

          {/* Dynamic render cho tất cả các group */}
          {groupKeys.map((groupKey) => {
            const { color, activeColor } = getGroupColor(groupKey);
            return (
              <Line
                key={groupKey}
                type="monotone"
                dataKey={groupKey}
                stroke={color}
                strokeWidth={3}
                dot={{ fill: color, r: 6 }}
                activeDot={{ r: 8, stroke: activeColor, strokeWidth: 2 }}
                name={groupKey}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChartComponent;