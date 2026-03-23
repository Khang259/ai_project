/**
 * Panel bản đồ cho tab Phân tích chuyên sâu (nửa phải màn hình).
 * - Gọi API map theo area_id (hook useDeepAnalysisMap).
 * - Hiển thị loading / lỗi / bản đồ.
 * - Responsive: chiều cao và padding theo breakpoint.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useArea } from '@/contexts/AreaContext';
import { useDeepAnalysisMap } from './useDeepAnalysisMap';
import DeepAnalysisMapCanvas from './DeepAnalysisMapCanvas';

export default function DeepAnalysisMapPanel({ robotPath = [], waitSpots = [], taskPoints = [] }) {
  const { t } = useTranslation();
  const { currAreaId, currAreaName } = useArea();
  const { mapData, loading, error, refetch } = useDeepAnalysisMap(currAreaId);

  if (currAreaId == null || currAreaId === '') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px] fullhd:min-h-[360px] text-gray-400 text-center px-4">
        <p className="text-base sm:text-lg">{t('area.notSelected')}</p>
        <p className="text-sm mt-1 opacity-80">{t('map.loading')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px] fullhd:min-h-[360px] text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[rgb(34,189,189)] border-t-transparent mb-3" />
        <p className="text-sm sm:text-base">{t('map.loading')} {currAreaName ?? currAreaId}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px] fullhd:min-h-[360px] text-red-400 text-center px-4">
        <p className="text-sm sm:text-base">{t('map.mapLoadError')} {currAreaName ?? currAreaId}</p>
        <p className="text-xs mt-2 opacity-80">{error}</p>
        <button
          type="button"
          onClick={refetch}
          className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!mapData) {
    return null;
  }

  return (
    <div className="w-full h-full min-h-[200px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px] fullhd:min-h-[360px] rounded-lg overflow-hidden flex flex-col">
      <DeepAnalysisMapCanvas mapData={mapData} robotPath={robotPath} waitSpots={waitSpots} taskPoints={taskPoints} className="flex-1 min-h-0 rounded-lg" />
    </div>
  );
}
