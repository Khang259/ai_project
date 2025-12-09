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
  setSearchNotificationProperty
}) {
  const handleDateChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-4">

      <div className="relative w-1/5">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searching.area")}
          value={searchNotificationProperty}
          onChange={(e) => setSearchNotificationProperty(e.target.value)}
          className="pl-8"
          style={{ border:"none", borderBottom:"1px solid #4b5563", width:"100%" }}
        />
      </div>

      {/* Mức độ cảnh báo */}
      <div className="relative w-1/5 pl-8">
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px] border-gray-600">
            <SelectValue placeholder={t("searching.priority")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả mức độ</SelectItem>
            <SelectItem value="Fatal">Fatal</SelectItem>
            <SelectItem value="Alert">Alert</SelectItem>
            <SelectItem value="Warning">Warning</SelectItem>
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

      {/* Nút xóa bộ lọc */}
      <Button
        variant="ghost" 
        size="icon" 
        onClick={onReset}>
        X
      </Button>
    </div>
  );
}