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

const data = [
  { thang: 'Tháng 1', Group_AE: 40, Group_DCC: 24, Group_MS2: 16 },
  { thang: 'Tháng 2', Group_AE: 30, Group_DCC: 13, Group_MS2: 22 },
  { thang: 'Tháng 3', Group_AE: 20, Group_DCC: 98, Group_MS2: 22 },
  { thang: 'Tháng 4', Group_AE: 27, Group_DCC: 3, Group_MS2: 20 },
  { thang: 'Tháng 5', Group_AE: 18, Group_DCC: 48, Group_MS2: 21 },
  { thang: 'Tháng 6', Group_AE: 23, Group_DCC: 38, Group_MS2: 25 },
  { thang: 'Tháng 7', Group_AE: 34, Group_DCC: 43, Group_MS2: 21 },
  { thang: 'Tháng 8', Group_AE: 42, Group_DCC: 51, Group_MS2: 55 },
  { thang: 'Tháng 9', Group_AE: 38, Group_DCC: 46, Group_MS2: 52 },
  { thang: 'Tháng 10', Group_AE: 45, Group_DCC: 52, Group_MS2: 55 },
  { thang: 'Tháng 11', Group_AE: 49, Group_DCC: 55, Group_MS2: 60 },
  { thang: 'Tháng 12', Group_AE: 52, Group_DCC: 60, Group_MS2: 65 },
];

const formatBattery = (value) => `${Math.round(Number(value) || 0)}%`;

const ColumnChart = () => {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1000px',
        padding: '30px',
        // backgroundColor: '#0E1838', // MÀU NỀN THEO YÊU CẦU
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
        <BarChart
          data={data}
        >
          {/* Lưới nền trong suốt hơn */}
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

          {/* Trục X */}
          <XAxis
            dataKey="thang"
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

          {/* Cột 1: Doanh thu - XANH DƯƠNG */}
          <Bar
            dataKey="Group_AE"
            fill="#3b82f6"
            radius={[8, 8, 0, 0]}
            name="Group_AE"
          />

          {/* Cột 2: Lợi nhuận - XANH LỤC */}
          <Bar
            dataKey="Group_DCC"
            fill="#10b981"
            radius={[8, 8, 0, 0]}
            name="Group_DCC"
          />

          {/* Cột 3: Chi phí - TÍM */}
          <Bar
            dataKey="Group_MS2"
            fill="#8b5cf6"
            radius={[8, 8, 0, 0]}
            name="Group_MS2"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ColumnChart;