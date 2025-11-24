import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'Hoàn thành', value: 70, color: '#3cb170' }, // emerald-500
  { name: 'Chưa hoàn thành', value: 30, color: '#a5b2bd' }, // gray-200
];

const SemiPieChart = () => {
  return (
    <div className="w-full h-65 md:h-40 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="75%" // Đẩy xuống dưới để tạo hiệu ứng semi
            innerRadius={60}
            outerRadius={80}
            startAngle={180}
            endAngle={0}
            dataKey="value"
            cornerRadius={8}
          >
            {data.map((entry, index) => (
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
            wrapperStyle={{ paddingTop: '0px' }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Hiển thị phần trăm ở giữa */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none ">
        <div className="text-center ">
          <div className="text-4xl font-bold text-gray-100 ">
            <div className="">
                {data[0].value}%
            </div>
          </div>
          {/* <div className="text-sm text-gray-600">{data[0].name}</div> */}
        </div>
      </div>
    </div>
  );
};

export default SemiPieChart;