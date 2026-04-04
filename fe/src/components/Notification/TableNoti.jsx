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
      case "Fatal":
        return "destructive";
      case "Alert":
        return "default";
      case "Warning":
        return "ghost"; 
      default:
        return "default";
    }
  };

  const thClass = "font-semibold text-white py-3 px-3 lg:py-4 lg:px-4 text-lg lg:text-xl";
  const tdClass = "text-white py-3 px-3 lg:py-4 lg:px-4 text-lg lg:text-xl";

  return (
    <Table className="text-lg lg:text-xl">
      <TableHeader>
        <TableRow>
          <TableHead className={thClass}>{t("notification.source")}</TableHead>
          <TableHead className={thClass}>{t("notification.alarm_level")}</TableHead>
          <TableHead className={thClass}>{t("notification.device_no")}</TableHead>
          <TableHead className={thClass}>{t("notification.abnormal_reason")}</TableHead>
          <TableHead className={thClass}>{t("notification.alarm_time")}</TableHead>
          <TableHead className={thClass}>{t("notification.operation")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.length === 0 ? (
          <TableRow>
            <TableCell className={`text-center text-white ${tdClass}`} colSpan={6}>
              {t("notification.no_data")}
            </TableCell>
          </TableRow>
        ) : (
          alerts.map((alert, index) => (
            <TableRow key={`${alert.source}-${index}`} className="text-white hover:bg-white/5">
              <TableCell className={tdClass}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  {alert.source}
                </span>
              </TableCell>
              <TableCell className={tdClass}>
                <Badge variant={getBadgeVariant(alert.alarmLevel)} className="text-base lg:text-lg px-2.5 py-0.5 text-white border border-white/30">
                  {alert.alarmLevel}
                </Badge>
              </TableCell>
              <TableCell className={tdClass}>{alert.deviceNo}</TableCell>
              <TableCell className={`max-w-xs truncate ${tdClass}`} title={alert.abnormalReason}>
                {alert.abnormalReason}
              </TableCell>
              <TableCell className={tdClass}>{alert.alarmTime}</TableCell>
              <TableCell className={tdClass}>
                <Button variant="ghost" size="sm" className="text-lg lg:text-xl text-white h-9 lg:h-10 px-3 hover:bg-white/10">
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