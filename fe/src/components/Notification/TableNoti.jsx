// components/Notification/TableNoti.jsx
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function TableNoti({ alerts }) {
  const getBadgeVariant = (level) => {
    switch (level) {
      case "Alert":
      case "High":
        return "destructive";
      case "Warning":
      case "Medium":
        return "default";
      case "Low":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-semibold text-white">Type</TableHead>
          <TableHead className="font-semibold text-white">Alarm Level</TableHead>
          <TableHead className="font-semibold text-white">Device No.</TableHead>
          <TableHead className="font-semibold text-white">Device Serial No.</TableHead>
          <TableHead className="font-semibold text-white">Abnormal Reason</TableHead>
          <TableHead className="font-semibold text-white">Alarm Time</TableHead>
          <TableHead className="font-semibold text-white">Operation</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-gray-400">
              Không có dữ liệu cảnh báo
            </TableCell>
          </TableRow>
        ) : (
          alerts.map((alert, index) => (
            <TableRow key={`${alert.id}-${index}`} className="text-white hover:bg-white/5">
              {/* Type */}
              <TableCell>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  {alert.messageType}
                </span>
              </TableCell>

              {/* Alarm Level */}
              <TableCell>
                <Badge variant={getBadgeVariant(alert.alarmLevel)}>
                  {alert.alarmLevel}
                </Badge>
              </TableCell>

              {/* Device No. */}
              <TableCell>{alert.deviceNo}</TableCell>

              {/* Device Serial No. */}
              <TableCell>{alert.deviceSerialNo}</TableCell>

              {/* Abnormal Reason */}
              <TableCell className="max-w-xs truncate" title={alert.abnormalReason}>
                {alert.abnormalReason}
              </TableCell>

              {/* Alarm Time */}
              <TableCell>{alert.alarmTime}</TableCell>
              
              {/* Operation */}
              <TableCell>
                <Button variant="ghost" size="sm">
                  Chi tiết
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}