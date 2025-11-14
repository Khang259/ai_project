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
        <h1 className="text-2xl font-semibold text-white">{t('area.areaManagement')}</h1>
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          onClick={onAdd}
          className="glass text-white px-4 py-2 rounded-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('area.addArea')}
        </Button>
      </div>
    </div>
  );
};

export default AreaHeader;
