import { useTranslation } from "react-i18next";
import AMRWarehouseMap from "@/components/Overview/map/AMRWarehouseMap/AMRWarehouseMap";

export default function WarehouseMap() {
  const { t } = useTranslation();
  return (
    <div className="h-[calc(100vh-5rem)] w-full flex flex-col -mx-4">
      <div className="flex items-center gap-8 px-4 pt-4 pb-2 flex-shrink-0">
        <h1 className="text-2xl font-semibold text-white">{t('map.pageTitle')}</h1>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <AMRWarehouseMap fullScreen />
      </div>
    </div>
  );
}
