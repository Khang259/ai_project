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
import { Search, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

const AreaFilters = ({ search, onSearchChange, areaFilter, onAreaChange, areas }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200">
      {/* Area Filter Dropdown */}
      <div className="flex items-center gap-2">
        <Select value={areaFilter} onValueChange={onAreaChange}>
          <SelectTrigger className="w-48 border-gray-300">
            <SelectValue placeholder={t('area.allAreas')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('area.allAreas')}</SelectItem>
            {areas.map((area) => (
              <SelectItem key={area.area_id} value={area.area_name}>
                {area.area_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </div>

      {/* Search Input */}
      <div className="flex-1 relative">
        <Input
          type="text"
          placeholder={t('area.enterAreaName')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4 py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
};

export default AreaFilters;
