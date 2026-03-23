// GraphChart.jsx
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ChartDataLabels from 'chartjs-plugin-datalabels';
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
  const { t } = useTranslation();
  const { data: chartData } = useGraphChart();

  const [scaleFontSize, setScaleFontSize] = React.useState({ x: 16, y: 16, datalabels: 18 });

  React.useEffect(() => {
    const tv = window.matchMedia('(min-width: 3840px)');
    const fullhd = window.matchMedia('(min-width: 1920px) and (max-width: 3839px)');
    const laptop13 = window.matchMedia('(min-width: 1366px) and (max-width: 1919px)');

    const update = () => {
      if (tv.matches) setScaleFontSize({ x: 24, y: 24, datalabels: 26 });
      else if (fullhd.matches) setScaleFontSize({ x: 12, y: 16, datalabels: 18 });
      else if (laptop13.matches) setScaleFontSize({ x: 12, y: 12, datalabels: 16 });
      else setScaleFontSize({ x: 14, y: 14, datalabels: 16 });
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

  // Merge data từ API với config styling
  const data = useMemo(() => {
    const baseData = chartData || { labels: [], datasets: [{ data: [] }] };
    
    return {
      labels: baseData.labels,
      datasets: [
        {
          label: t('statistics.graphChartLabel'),
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
  }, [chartData, t]);

  // Cấu hình biểu đồ
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e0e7ff',
          font: { size: scaleFontSize.x },
          padding: 10,
          usePointStyle: true,
        },
      },
      datalabels: {
        display: true,
        align: (ctx) => {
          const value = Number(ctx.dataset.data[ctx.dataIndex]);
          return Number.isFinite(value) && value > 80 ? 'bottom' : 'top';
        },
        offset: 4,
        color: '#00ddeb',
        font: { size: scaleFontSize.datalabels, weight: 'bold' },
        formatter: (value) => {
          const n = Number(value);
          return Number.isFinite(n) ? `${n.toFixed(2)}%` : `${value}%`;
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
        callbacks: {
          label: (ctx) => {
            const n = Number(ctx.parsed.y);
            return `${t('statistics.graphChartTitle')}: ${Number.isFinite(n) ? n.toFixed(2) : ctx.parsed.y}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(138, 43, 226, 0.2)', borderDash: [6, 6] },
        ticks: { color: '#b19cd9', font: { size: scaleFontSize.x } },
      },
      y: {
        grid: { color: 'rgba(138, 43, 226, 0.2)', borderDash: [6, 6] },
        ticks: { color: '#b19cd9', font: { size: scaleFontSize.y } },
        beginAtZero: true,
      },
    },
    animation: { duration: 2200, easing: 'easeInOutQuart' },
  }), [scaleFontSize, t]);

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
      className="h-full flex flex-col min-h-0 px-2 py-1.5 lg:px-3 lg:py-2 xl:px-3 fullhd:px-4 fullhd:py-3"
      style={{
        width: '100%',
        background: 'rgba(15, 12, 41, 0.7)',
        borderRadius: '16px',
        boxShadow: '0 0 30px rgba(138, 43, 226, 0.4)',
        border: '1px solid rgba(138, 43, 226, 0.3)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <h2 className="text-white shrink-0 mb-1" style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.5rem)', fontWeight: 700, fontFamily: 'Arial, sans-serif', textAlign: 'left' }}>
        {t('statistics.graphChartTitle')}
      </h2>
      <div className="flex-1 min-h-0 relative" style={{ position: 'relative' }}>
        <Line data={data} options={options} plugins={[glowPlugin, ChartDataLabels]} />
      </div>
    </div>
  );
};
export default GraphChart;