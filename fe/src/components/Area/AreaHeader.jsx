// src/components/Area/AreaHeader.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

const AreaHeader = ({ onAdd }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl lg:text-4xl font-semibold text-white">{t('area.areaManagement')}</h1>
      </div>
      <div className="flex items-center gap-3">
        <Button
          onClick={onAdd}
          className="glass text-white px-4 lg:px-5 py-2.5 lg:py-3 rounded-md flex items-center gap-2 text-base lg:text-lg h-11 lg:h-12 min-h-[2.75rem] lg:min-h-[3rem]"
        >
          <Plus className="w-5 h-5" />
          {t('area.addArea')}
        </Button>
      </div>
    </div>
  );
};

export default AreaHeader;
