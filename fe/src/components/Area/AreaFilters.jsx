// src/components/Area/AreaFilters.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

const AreaFilters = ({ search, onSearchChange, areaFilter, onAreaChange, areas }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-4 p-4 text-white">
      <div className="flex items-center gap-2">
        <Select value={areaFilter} onValueChange={onAreaChange}>
          <SelectTrigger className="w-48 lg:w-56 border-gray-300 text-base lg:text-lg h-11 lg:h-12">
            <SelectValue placeholder={t('area.allAreas')} />
          </SelectTrigger>
          <SelectContent className="text-base lg:text-lg">
            <SelectItem value="all" className="text-base lg:text-lg">{t('area.allAreas')}</SelectItem>
            {areas.map((area) => (
              <SelectItem key={area.area_id} value={area.area_name} className="text-base lg:text-lg">
                {area.area_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ChevronDown className="w-5 h-5 lg:w-5 lg:h-5 text-gray-500" />
      </div>

      {/* Search Input */}
      {/* <div className="flex-1 relative">
        <Input
          placeholder={t('users.searchByName')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-[200px] rounded-lg text-white"
        />
      </div> */}
    </div>
  );
};

export default AreaFilters;
