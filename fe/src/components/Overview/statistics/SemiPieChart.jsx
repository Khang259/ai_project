import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const SemiPieChart = ({ data }) => {
  const { t } = useTranslation();
  const defaultData = [
    { name: t('statistics.semiPieCompleted'), value: 0, color: '#3cb170' },
    { name: t('statistics.semiPieIncomplete'), value: 0, color: '#a5b2bd' },
  ];
  const chartData = data?.chartData || defaultData;
  const percentage = data?.percentage || 0;
  const [isLaptop, setIsLaptop] = useState(false);
  const [isTV, setIsTV] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px) and (max-width: 1279px)');
    const onChange = () => setIsLaptop(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  useEffect(() => {
    const tv = window.matchMedia('(min-width: 3840px)');
    const onChange = () => setIsTV(tv.matches);
    onChange();
    tv.addEventListener('change', onChange);
    return () => tv.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="w-full h-full min-h-[140px] lg:min-h-[160px] laptop13:min-h-[168px] fullhd:min-h-[160px] tv:min-h-[420px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="63%"
            innerRadius="60%"
            outerRadius="96%"
            startAngle={180}
            endAngle={0}
            dataKey="value"
            cornerRadius={8}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color} 
                stroke={entry.color}
                strokeWidth={2}
              />
            ))}
          </Pie>

          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            wrapperStyle={{
              fontSize: isTV ? '1.5rem' : 'clamp(0.7rem, 1.2vw, 0.95rem)',
            }}
            iconSize={isTV ? 22 : 14}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-2xl lg:text-3xl xl:text-3xl laptop13:text-3xl fullhd:text-3xl tv:text-8xl font-bold text-gray-100">{percentage}%</div>
        </div>
      </div>
    </div>
  );
};

export default SemiPieChart;