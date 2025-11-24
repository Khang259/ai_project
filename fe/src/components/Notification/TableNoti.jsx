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
import { useTranslation } from "react-i18next";

export default function TableNoti({ alerts }) {
  const { t } = useTranslation();

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
          <TableHead className="font-semibold text-white">{t("notification.source")}</TableHead>
          <TableHead className="font-semibold text-white">{t("notification.area")}</TableHead>
          <TableHead className="font-semibold text-white">{t("notification.group")}</TableHead>
          <TableHead className="font-semibold text-white">{t("notification.route")}</TableHead>
          <TableHead className="font-semibold text-white">{t("notification.alarm_level")}</TableHead>
          <TableHead className="font-semibold text-white">{t("notification.device_no")}</TableHead>
          <TableHead className="font-semibold text-white">{t("notification.abnormal_reason")}</TableHead>
          <TableHead className="font-semibold text-white">{t("notification.alarm_time")}</TableHead>
          <TableHead className="font-semibold text-white">{t("notification.operation")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.length === 0 ? (
          <TableRow>
            <TableCell className="text-center text-gray-400">
              {t("notification.no_data")}
            </TableCell>
          </TableRow>
        ) : (
          alerts.map((alert, index) => (
            <TableRow key={`${alert.source}-${index}`} className="text-white hover:bg-white/5">
              {/* Type */}
              <TableCell>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  {alert.source}
                </span>
              </TableCell>

              {/* Area */}
              <TableCell>{alert.area}</TableCell>

              {/* Group */}
              <TableCell>{alert.group}</TableCell>

              {/* Route  */}
              <TableCell>{alert.route}</TableCell>

              {/* Alarm Level */}
              <TableCell>
                <Badge variant={getBadgeVariant(alert.alarmLevel)}>
                  {alert.alarmLevel}
                </Badge>
              </TableCell>

              {/* Device No. */}
              <TableCell>{alert.deviceNo}</TableCell>

              {/* Abnormal Reason */}
              <TableCell className="max-w-xs truncate" title={alert.abnormalReason}>
                {alert.abnormalReason}
              </TableCell>

              {/* Alarm Time */}
              <TableCell>{alert.alarmTime}</TableCell>

              {/* Operation */}
              <TableCell>
                <Button variant="ghost" size="sm">
                  {t("notification.detail")}
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}