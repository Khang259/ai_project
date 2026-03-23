// components/Notification/TableFilter.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import DateRangePicker from "@/components/TaskManagement/DateRangePicker";
import { useTranslation } from "react-i18next";

export default function TableFilter({
  priorityFilter,
  setPriorityFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onReset,
  searchNotificationProperty,
  setSearchNotificationProperty,
  areaIdFilter,
  setAreaIdFilter,
}) {
  const handleDateChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="relative w-1/5 min-w-[160px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/80" />
        <Input
          placeholder={t("searching.area")}
          value={searchNotificationProperty}
          onChange={(e) => setSearchNotificationProperty(e.target.value)}
          className="pl-10 text-base lg:text-lg h-11 lg:h-12 text-white placeholder:text-gray-400"
          style={{ border:"none", borderBottom:"1px solid #4b5563", width:"100%" }}
        />
      </div>
      <div className="relative w-1/5 min-w-[140px]">
        <Select value={areaIdFilter || "all"} onValueChange={(v) => setAreaIdFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[140px] lg:w-[160px] border-gray-600 text-base lg:text-lg h-11 lg:h-12 text-white">
            <SelectValue placeholder={t('taskManagement.areaPlaceholder')} />
          </SelectTrigger>
          <SelectContent className="text-base lg:text-lg text-white">
            <SelectItem value="all" className="text-base lg:text-lg text-white">{t('notification.allAreas')}</SelectItem>
            <SelectItem value="1" className="text-base lg:text-lg text-white">Area 1</SelectItem>
            <SelectItem value="2" className="text-base lg:text-lg text-white">Area 2</SelectItem>
            <SelectItem value="3" className="text-base lg:text-lg text-white">Area 3</SelectItem>
            <SelectItem value="4" className="text-base lg:text-lg text-white">Area 4</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="relative w-1/5 pl-8 min-w-[180px]">
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px] lg:w-[200px] border-gray-600 text-base lg:text-lg h-11 lg:h-12 text-white">
            <SelectValue placeholder={t("searching.priority")} />
          </SelectTrigger>
          <SelectContent className="text-base lg:text-lg text-white">
            <SelectItem value="all" className="text-base lg:text-lg text-white">{t('notification.allLevels')}</SelectItem>
            <SelectItem value="Fatal" className="text-base lg:text-lg text-white">Fatal</SelectItem>
            <SelectItem value="Alert" className="text-base lg:text-lg text-white">Alert</SelectItem>
            <SelectItem value="Warning" className="text-base lg:text-lg text-white">Warning</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-1">
        <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          onReset();
          if (setAreaIdFilter) setAreaIdFilter("");
        }}
        className="h-11 w-11 lg:h-12 lg:w-12 text-base lg:text-lg text-white hover:bg-white/10"
      >
        X
      </Button>
    </div>
  );
}