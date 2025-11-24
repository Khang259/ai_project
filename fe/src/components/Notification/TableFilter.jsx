// components/Notification/TableFilter.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function TableFilter({
  searchQuery,
  setSearchQuery,
  priorityFilter,
  setPriorityFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  onReset,
}) {
  return (
    <div className="flex flex-wrap gap-4 mt-4">
      {/* Tìm kiếm */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm theo loại cảnh báo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 glass"
        />
      </div>

      {/* Mức độ cảnh báo */}
      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
        <SelectTrigger className="w-[180px] glass">
          <SelectValue placeholder="Mức độ cảnh báo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả mức độ</SelectItem>
          <SelectItem value="Low">Low</SelectItem>
          <SelectItem value="Medium">Medium</SelectItem>
          <SelectItem value="High">High</SelectItem>
          <SelectItem value="Alert">Alert</SelectItem>
          <SelectItem value="Warning">Warning</SelectItem>
        </SelectContent>
      </Select>

      {/* Từ giờ - Đến giờ */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-white whitespace-nowrap">Từ giờ:</label>
        <Input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-[120px] glass"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-white whitespace-nowrap">Đến giờ:</label>
        <Input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="w-[120px] glass"
        />
      </div>

      {/* Từ ngày */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-white whitespace-nowrap">Từ ngày:</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-start text-left font-normal glass">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "dd/MM/yyyy", { locale: vi }) : "Chọn ngày"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={vi} />
          </PopoverContent>
        </Popover>
      </div>

      {/* Đến ngày */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-white whitespace-nowrap">Đến ngày:</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-start text-left font-normal glass">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "dd/MM/yyyy", { locale: vi }) : "Chọn ngày"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={vi} />
          </PopoverContent>
        </Popover>
      </div>

      {/* Nút xóa bộ lọc */}
      <Button variant="outline" className="glass" onClick={onReset}>
        Xóa bộ lọc
      </Button>
    </div>
  );
}