// GraphChart.jsx
import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useGraphChart } from '@/hooks/Dashboard/useGraphChart';

// Đăng ký Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const GraphChart = () => {
  const { data: chartData } = useGraphChart();

  // Merge data từ API với config styling
  const data = useMemo(() => {
    const baseData = chartData || { labels: [], datasets: [{ data: [] }] };
    
    return {
      labels: baseData.labels,
      datasets: [
        {
          label: 'Hiệu suất làm việc (%)',
          data: baseData.datasets[0]?.data || [],
          fill: true,
          backgroundColor: (ctx) => {
            const chart = ctx.chart;
            const { ctx: canvasCtx, chartArea } = chart;
            if (!chartArea) return null;
            const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(0, 221, 235, 0.6)');
            gradient.addColorStop(0.5, 'rgba(138, 43, 226, 0.4)');
            gradient.addColorStop(1, 'rgba(138, 43, 226, 0.05)');
            return gradient;
          },
          borderColor: '#8a2be2',
          borderWidth: 3,
          pointBackgroundColor: '#00ddeb',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 9,
          tension: 0.4,
        },
      ],
    };
  }, [chartData]);

  // Cấu hình biểu đồ
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e0e7ff',
          font: { size: 14 },
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 12, 41, 0.95)',
        titleColor: '#00ddeb',
        bodyColor: '#e0e7ff',
        borderColor: '#8a2be2',
        borderWidth: 1,
        cornerRadius: 10,
        displayColors: false,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(138, 43, 226, 0.2)', borderDash: [6, 6] },
        ticks: { color: '#b19cd9' },
      },
      y: {
        grid: { color: 'rgba(138, 43, 226, 0.2)', borderDash: [6, 6] },
        ticks: { color: '#b19cd9' },
        beginAtZero: true,
      },
    },
    animation: { duration: 2200, easing: 'easeInOutQuart' },
  };

  // Plugin hiệu ứng glow
  const glowPlugin = {
    id: 'glow',
    beforeDraw: (chart) => {
      const ctx = chart.ctx;
      ctx.save();
      ctx.shadowColor = 'rgba(138, 43, 226, 0.8)';
      ctx.shadowBlur = 25;
      chart.data.datasets.forEach((dataset) => {
        const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
        if (meta.hidden) return;
        meta.data.forEach((point) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
          ctx.fillStyle = '#00ddeb';
          ctx.fill();
        });
      });
      ctx.restore();
    },
  };

  return (
    <div
      style={{  
        width: '100%',
        background: 'rgba(15, 12, 41, 0.7)',
        padding: '0px 0px 10px 10px',
        borderRadius: '16px',
        boxShadow: '0 0 30px rgba(138, 43, 226, 0.4)',
        border: '1px solid rgba(138, 43, 226, 0.3)',
        backdropFilter: 'blur(12px)',
        textAlign: 'center',
      }}
    >
      <h2 className="text-white mb-2 ml-4, pt-4" style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Arial, sans-serif', textAlign: 'left'}}>
        Hiệu suất làm việc 
      </h2>
      <div
        style={{
          position: 'relative',
          height: '400px',
        }}
      >
        <Line data={data} options={options} plugins={[glowPlugin]} />
      </div>
    </div>
  );
};
export default GraphChart;