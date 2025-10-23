import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Search } from "lucide-react";
import { useArea } from "@/contexts/AreaContext";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const alerts = [
  {
    id: 1,
    messageType: "Service exception",
    alarmLevel: "Alert",
    alarmStatus: "Resumed",
    deviceNo: "No corresponding",
    deviceSerialNo: "No corresponding",
    coordinates: "--",
    node: "--",
    abnormalReason: "Server 192.168.1.169 CPU ...",
    alarmTime: "2025-09-26 09:22:20",
    endTime: "2025-09-26 09:23:04",
    note: "",
  },
  {
    id: 1,
    messageType: "Service exception",
    alarmLevel: "Alert",
    alarmStatus: "Resumed",
    deviceNo: "No corresponding",
    deviceSerialNo: "No corresponding",
    coordinates: "--",
    node: "--",
    abnormalReason: "Server 192.168.1.169 CPU ...",
    alarmTime: "2025-09-26 09:22:20",
    endTime: "2025-09-26 09:23:04",
    note: "",
  },
  {
    id: 1,
    messageType: "Service exception",
    alarmLevel: "Alert",
    alarmStatus: "Resumed",
    deviceNo: "No corresponding",
    deviceSerialNo: "No corresponding",
    coordinates: "--",
    node: "--",
    abnormalReason: "Server 192.168.1.169 CPU ...",
    alarmTime: "2025-09-26 09:22:20",
    endTime: "2025-09-26 09:23:04",
    note: "",
  },
  {
    id: 1,
    messageType: "Service exception",
    alarmLevel: "Alert",
    alarmStatus: "Resumed",
    deviceNo: "No corresponding",
    deviceSerialNo: "No corresponding",
    coordinates: "--",
    node: "--",
    abnormalReason: "Server 192.168.1.169 CPU ...",
    alarmTime: "2025-09-26 09:22:20",
    endTime: "2025-09-26 09:23:04",
    note: "",
  },
  {
    id: 1,
    messageType: "Service exception",
    alarmLevel: "Warning",
    alarmStatus: "Resumed",
    deviceNo: "No corresponding",
    deviceSerialNo: "No corresponding",
    coordinates: "--",
    node: "--",
    abnormalReason: "Server 192.168.1.169 CPU ...",
    alarmTime: "2025-09-26 09:22:20",
    endTime: "2025-09-26 09:23:04",
    note: "",
  }
];

export default function AlertTable() {
  const { currAreaName, currAreaId } = useArea();
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  return (
    <div className="p-6 ml-6 mr-6 border border-gray-200 rounded-xl shadow-md">
      <div>
        <h1 className="text-4xl font-semibold text-gray-900 ">Trang thông báo</h1>
      </div>
      {/* Tất cả các bộ lọc */}
      <div className="flex flex-wrap gap-4 mt-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo loại cảnh báo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Mức độ cảnh báo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mức độ cảnh báo</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Từ giờ:</label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-[120px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Đến giờ:</label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-[120px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Từ ngày:</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[200px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd/MM/yyyy", { locale: vi }) : "Chọn ngày"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                locale={vi}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Đến ngày:</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[200px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd/MM/yyyy", { locale: vi }) : "Chọn ngày"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                locale={vi}
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            setStartDate(null);
            setEndDate(null);
            setStartTime("");
            setEndTime("");
            setSearchQuery("");
            setPriorityFilter("all");
          }}
        >
          Xóa bộ lọc
        </Button>
      </div>
      <Table>
        <TableCaption>Danh sách cảnh báo hệ thống</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Alarm Level</TableHead>
            <TableHead>Device No.</TableHead>
            <TableHead>Device Serial No.</TableHead>
            <TableHead>Abnormal Reason</TableHead>
            <TableHead>Alarm Time</TableHead>
            <TableHead>Operation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow key={alert.id}>
              <TableCell>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  {alert.messageType}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="destructive">{alert.alarmLevel}</Badge>
              </TableCell>
              <TableCell>{alert.deviceNo}</TableCell>
              <TableCell>{alert.deviceSerialNo}</TableCell>
              <TableCell>{alert.abnormalReason}</TableCell>
              <TableCell>{alert.alarmTime}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm">
                  Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
