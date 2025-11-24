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

const LineChartComponent = () => {
  const data = [
    { thang: '1', Group_AE: 40, Group_DCC: 24 },
    { thang: '2', Group_AE: 30, Group_DCC: 13 },
    { thang: '3', Group_AE: 20, Group_DCC: 98 },
    { thang: '4', Group_AE: 27, Group_DCC: 3 },
    { thang: '5', Group_AE: 18, Group_DCC: 48 },
    { thang: '6', Group_AE: 23, Group_DCC: 38 },
    { thang: '7', Group_AE: 34, Group_DCC: 43 },
    { thang: '8', Group_AE: 42, Group_DCC: 51 },
    { thang: '9', Group_AE: 38, Group_DCC: 46 },
    { thang: '10', Group_AE: 45, Group_DCC: 52 },
    { thang: '11', Group_AE: 49, Group_DCC: 55 },
    { thang: '12', Group_AE: 52, Group_DCC: 60 },
  ];

  const formatBattery = (value) => `${Math.round(Number(value) || 0)}%`;

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

          {/* Đường Group_AE - Xanh dương */}
          <Line
            type="monotone"
            dataKey="Group_AE"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 6 }}
            activeDot={{ r: 8, stroke: '#1d4ed8', strokeWidth: 2 }}
            name="Group_AE"
          />

          {/* Đường Lợi nhuận - Xanh lục */}
          <Line
            type="monotone"
            dataKey="Group_DCC"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ fill: '#10b981', r: 6 }}
            activeDot={{ r: 8, stroke: '#059669', strokeWidth: 2 }}
            name="Group_DCC"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChartComponent;