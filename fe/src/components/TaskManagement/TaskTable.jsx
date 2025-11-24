// components/TaskManagement/TaskTable.jsx
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
import { useTranslation } from "react-i18next";

export default function TaskTable({ tasks }) {
  const { t } = useTranslation();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-semibold text-white">{t("task.order_id")}</TableHead>
          <TableHead className="font-semibold text-white">{t("task.group")}</TableHead>
          <TableHead className="font-semibold text-white">{t("task.route")}</TableHead>
          <TableHead className="font-semibold text-white">{t("task.model_process_code")}</TableHead>
          <TableHead className="font-semibold text-white">{t("task.device_code")}</TableHead>
          <TableHead className="font-semibold text-white">{t("task.device_num")}</TableHead>
          <TableHead className="font-semibold text-white">{t("task.qr_code")}</TableHead>
          <TableHead className="font-semibold text-white">{t("task.status")}</TableHead>
          <TableHead className="font-semibold text-white">{t("task.updated_at")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center text-gray-400">
              {t("notification.no_data")}
            </TableCell>
          </TableRow>
        ) : (
          tasks.map((task, index) => (
            <TableRow key={`${task.order_id}-${index}`} className="text-white hover:bg-white/5">
              {/* Order ID */}
              <TableCell>{task.order_id}</TableCell>

              {/* Group */}
              <TableCell>{task.group}</TableCell>

              {/* Route */}
              <TableCell>{task.route}</TableCell>

              {/* Model Process Code */}
              <TableCell>{task.model_process_code}</TableCell>

              {/* Device Code */}
              <TableCell>{task.device_code}</TableCell>

              {/* Device Num */}
              <TableCell>{task.device_num}</TableCell>

              {/* QR Code */}
              <TableCell className="max-w-xs truncate" title={task.qr_code}>
                {task.qr_code}
              </TableCell>

              {/* Status */}
              <TableCell>
                <Badge variant={task.status === "completed" ? "default" : task.status === "failed" ? "destructive" : "secondary"}>
                  {task.status}
                </Badge>
              </TableCell>

              {/* Updated At */}
              <TableCell>{task.updated_at}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}