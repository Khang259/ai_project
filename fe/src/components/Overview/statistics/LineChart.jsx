// src/components/LineChart.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
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
  "Có tải": { color: '#10b981', activeColor: '#059669' },
  "Không tải": { color: '#3b82f6', activeColor: '#2563eb' },
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
  const { t } = useTranslation();
  const data = useLineChart();

  const getLegendName = (groupKey) => {
    if (groupKey === 'Có tải') return t('statistics.lineChartWithPayload');
    if (groupKey === 'Không tải') return t('statistics.lineChartWithoutPayload');
    return groupKey;
  };

  // Tự động lấy danh sách group keys từ data (bỏ key trục X là 'gio')
  const groupKeys = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter(key => key !== 'gio');
  }, [data]);

  return (
    <div
      className="h-full flex flex-col min-h-0 px-2 py-1.5 lg:px-3 lg:py-2 xl:px-3 fullhd:px-4 fullhd:py-3"
      style={{
        width: '100%',
        fontFamily: 'Arial, sans-serif',
        color: '#e2e8f0',
      }}
    >
      <h2
        className="shrink-0"
        style={{
          textAlign: 'left',
          marginBottom: '4px',
          color: '#ffffff',
          fontSize: 'clamp(0.9rem, 1.8vw, 1.5rem)',
          fontWeight: 'bold',
        }}
      >
        {t('statistics.lineChartTitle')}
      </h2>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke="#334155" />

          <XAxis
            dataKey="gio"
            tick={{ fill: '#cbd5e1', fontSize: 20, fontWeight: 500 }}
            axisLine={{ stroke: '#475569' }}
          />

          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fill: '#cbd5e1', fontSize: 20, fontWeight: 500 }}
          />

          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f1f5f9' }}
            labelStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
            // Hiển thị % và giá trị gốc (raw) lấy từ payload
            formatter={(value, name) => {
              return [`${value}%`, getLegendName(name)];
            }}
          />

          <Legend
            wrapperStyle={{ paddingTop: '8px' }}
            iconType="line"
            iconSize={14}
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
                name={getLegendName(groupKey)}
                label={(props) => {
                  const { x, y, value } = props;
                  const isBottom = value != null && value > 95;
                  return (
                    <text
                      x={x}
                      y={y}
                      dy={isBottom ? 16 : -12}
                      textAnchor="middle"
                      fill={color}
                      fontSize={22}
                      fontWeight="bold"
                    >
                      {value != null ? `${Math.round(value)}%` : ''}
                    </text>
                  );
                }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LineChartComponent;