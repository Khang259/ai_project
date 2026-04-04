import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { DateTimeRangeFilter } from "./DateTimeRangeFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

export default function TaskFilter({
  setSearchTaskProperty,
  searchTaskProperty,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  statusFilter,
  setStatusFilter,
  onReset,
}) {
  const handleDateTimeChange = (start, end) => {
    setStartDate(start || null);
    setEndDate(end || null);
  };

  const { t } = useTranslation();

  return (
    <div className="flex flex-col-2 justify-between mb-6 text-white">
      <div className="relative flex-1 max-w-sm min-h-[2.75rem] lg:min-h-[3rem]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 lg:h-5 lg:w-5 text-gray-400" />
        <Input
          placeholder={t("searching.search")}
          value={searchTaskProperty}
          onChange={(e) => setSearchTaskProperty(e.target.value)}
          className="pl-10 text-base lg:text-lg h-11 lg:h-12 text-white placeholder:text-gray-400"
          style={{
            border: "none",
            borderBottom: "1px solid rgb(162, 172, 190)",
            width: "100%",
          }}
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <DateTimeRangeFilter
          valueStart={startDate}
          valueEnd={endDate}
          onFilterChange={handleDateTimeChange}
        />
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger
            className="h-11 lg:h-12 min-w-[10rem] lg:min-w-[11rem] text-base lg:text-lg text-white border-gray-500 bg-white/5 hover:bg-white/10"
            style={{ borderBottom: "1px solid rgb(162, 172, 190)" }}
          >
            <SelectValue placeholder={t("taskManagement.filterByStatus")} />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600 text-white">
            <SelectItem value="all" className="text-white focus:bg-white/10 focus:text-white">
              {t("taskManagement.filterStatusAll")}
            </SelectItem>
            <SelectItem value="completed" className="text-white focus:bg-white/10 focus:text-white">
              {t("taskManagement.filterStatusCompleted")}
            </SelectItem>
            <SelectItem value="cancel" className="text-white focus:bg-white/10 focus:text-white">
              {t("taskManagement.filterStatusCancel")}
            </SelectItem>
            <SelectItem value="failed" className="text-white focus:bg-white/10 focus:text-white">
              {t("taskManagement.filterStatusFailed")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="ghost"
        onClick={onReset}
        className="text-gray-300 hover:text-white hover:bg-white/10 w-fit h-11 lg:h-12 px-3"
      >
        <X className="h-5 w-5 lg:h-5 lg:w-5" />
      </Button>
    </div>
  );
}

