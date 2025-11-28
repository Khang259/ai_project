// src/components/ColumnChart.jsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useColumnChart } from '@/hooks/Dashboard/useColumnChart';

// Định nghĩa màu cho các group
const GROUP_CONFIG = {
  Group_AE: '#3b82f6',
  Group_DCC: '#10b981',
  Group_KD: '#f59e0b',
  Group_MS: '#8b5cf6',
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

const ColumnChart = () => {
  const data = useColumnChart();

  // Tự động lấy danh sách group keys từ data
  const getGroupKeys = () => {
    if (!data || data.length === 0) return [];
    const keys = Object.keys(data[0]).filter(key => key !== 'gio');
    return keys;
  };

  const groupKeys = getGroupKeys();

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1000px',
        padding: '30px',
        borderRadius: '16px',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
        fontFamily: 'Arial, sans-serif',
        color: '#e2e8f0',
      }}
    >
      <h2
        style={{
          textAlign: 'left',
          color: '#ffffff',
          fontSize: '26px',
          fontWeight: 'bold',
          paddingBottom: '20px',
        }}
      >
        Biểu đồ Cột
      </h2>

      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={data}>
          {/* Lưới nền trong suốt hơn */}
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

          {/* Trục X */}
          <XAxis
            dataKey="gio"
            tick={{ fill: '#cbd5e1', fontSize: 14 }}
            axisLine={{ stroke: '#475569' }}
          />

          {/* Trục Y */}
          <YAxis
            tickFormatter={formatBattery}
            tick={{ fill: '#cbd5e1', fontSize: 14 }}
            axisLine={{ stroke: '#475569' }}
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
            wrapperStyle={{ paddingTop: '20px', color: '#e2e8f0' }}
            iconType="rect"
          />

          {/* Dynamic render cho tất cả các group */}
          {groupKeys.map((groupKey) => {
            const color = getGroupColor(groupKey);
            return (
              <Bar
                key={groupKey}
                dataKey={groupKey}
                fill={color}
                radius={[8, 8, 0, 0]}
                name={groupKey}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ColumnChart;