import React from "react";
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
  }
];

export default function AlertTable() {
  return (
    <div className="p-6 ml-6 mr-6 border border-gray-200 rounded-xl shadow-md">
      <div>
        <h1 className="text-4xl font-semibold text-gray-900 ">Trang thông báo</h1>
      </div>
      <Table>
        <TableCaption>Danh sách cảnh báo hệ thống</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Message Type</TableHead>
            <TableHead>Alarm Level</TableHead>
            <TableHead>Alarm Status</TableHead>
            <TableHead>Device No.</TableHead>
            <TableHead>Device Serial No.</TableHead>
            <TableHead>Coordinates</TableHead>
            <TableHead>Node</TableHead>
            <TableHead>Abnormal Reason</TableHead>
            <TableHead>Alarm Time</TableHead>
            <TableHead>End Time</TableHead>
            <TableHead>Note</TableHead>
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
              <TableCell>{alert.alarmStatus}</TableCell>
              <TableCell>{alert.deviceNo}</TableCell>
              <TableCell>{alert.deviceSerialNo}</TableCell>
              <TableCell>{alert.coordinates}</TableCell>
              <TableCell>{alert.node}</TableCell>
              <TableCell>{alert.abnormalReason}</TableCell>
              <TableCell>{alert.alarmTime}</TableCell>
              <TableCell>{alert.endTime}</TableCell>
              <TableCell>{alert.note}</TableCell>
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
