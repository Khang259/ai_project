// src/components/ColumnChart.jsx
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
import { useColumnChart } from '@/hooks/Dashboard/useColumnChart';

import { COLUMN_CHART_VALUE_KEY } from "@/services/Dashboard/columnChart";

// Định nghĩa màu cho cột (1 cột: tỷ lệ hoàn thành / tổng %)
const GROUP_CONFIG = {
  [COLUMN_CHART_VALUE_KEY]: '#10b981',
};

const getGroupColor = (groupKey) => GROUP_CONFIG[groupKey] || '#10b981';

// Hiển thị % (0–100)
const formatValue = (value) => {
  const n = Number(value) || 0;
  return n % 1 === 0 ? `${Math.round(n)}%` : `${n.toFixed(1)}%`;
};

const ColumnChart = () => {
  const { t } = useTranslation();
  const data = useColumnChart();

  // Tự động lấy danh sách group keys từ data
  const getGroupKeys = () => {
    if (!data || data.length === 0) return [];
    const keys = Object.keys(data[0]).filter(key => key !== 'gio');
    return keys;
  };

  const groupKeys = getGroupKeys();

  const [labelFontSize, setLabelFontSize] = React.useState(22);

  React.useEffect(() => {
    const tv = window.matchMedia('(min-width: 3840px)');
    const fullhd = window.matchMedia('(min-width: 1920px) and (max-width: 3839px)');
    const laptop13 = window.matchMedia('(min-width: 1366px) and (max-width: 1919px)');

    const update = () => {
      if (tv.matches) setLabelFontSize(32);
      else if (fullhd.matches) setLabelFontSize(16);
      else if (laptop13.matches) setLabelFontSize(18);
      else setLabelFontSize(20);
    };

    update();
    tv.addEventListener('change', update);
    fullhd.addEventListener('change', update);
    laptop13.addEventListener('change', update);
    return () => {
      tv.removeEventListener('change', update);
      fullhd.removeEventListener('change', update);
      laptop13.removeEventListener('change', update);
    };
  }, []);

  // Trục Y cố định 0–100% cho tỷ lệ hoàn thành/tổng
  const maxTotalValue = 100;

  return (
    <div
      className="h-full flex flex-col min-h-0 px-2 py-1.5 lg:px-3 lg:py-2 xl:px-3 laptop13:px-3 laptop13:py-2 fullhd:px-4 fullhd:py-3 tv:px-6 tv:py-4"
      style={{
        width: '100%',
        borderRadius: '16px',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
        fontFamily: 'Arial, sans-serif',
        color: '#e2e8f0',
      }}
    >
      <h2
        className="text-white shrink-0 mb-1"
        style={{
          fontSize: 'clamp(0.9rem, 1.8vw, 1.5rem)',
          fontWeight: 700,
          fontFamily: 'Arial, sans-serif',
          textAlign: 'left',
        }}
      >
        {t('statistics.columnChartTitle')}
      </h2>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} key={`bar-${labelFontSize}`}>
          {/* Lưới nền trong suốt hơn */}
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

          {/* Trục X - số giờ to hơn */}
          <XAxis
            dataKey="gio"
            tick={{ fill: '#cbd5e1', fontSize: 20, fontWeight: 500 }}
            axisLine={{ stroke: '#475569' }}
          />

          {/* Trục Y - số liệu trực tiếp */}
          <YAxis
            domain={[0, maxTotalValue]}
            tickFormatter={(value) => formatValue(value)}
            tick={{ fill: '#cbd5e1', fontSize: 20, fontWeight: 500 }}
            axisLine={{ stroke: '#475569' }}
          />

          {/* Tooltip - hiển thị số liệu trực tiếp */}
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#f1f5f9',
            }}
            labelStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
            formatter={(value) => formatValue(value)}
          />

          {/* Legend */}
          <Legend
            wrapperStyle={{ paddingTop: '8px', color: '#e2e8f0' }}
            iconType="rect"
            iconSize={14}
          />

          {groupKeys.map((groupKey) => {
            const color = getGroupColor(groupKey);
            const displayName = groupKey === COLUMN_CHART_VALUE_KEY ? t('statistics.columnChartLegendLabel') : groupKey;
            return (
              <Bar
                key={groupKey}
                dataKey={groupKey}
                fill={color}
                radius={[4, 4, 0, 0]}
                name={displayName}
              >
                <LabelList
                  dataKey={groupKey}
                  position="center"
                  fill="#fff"
                  fontSize={labelFontSize}
                  fontWeight="bold"
                  formatter={(value) => (value == null ? '' : formatValue(value))}
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

export default ColumnChart;