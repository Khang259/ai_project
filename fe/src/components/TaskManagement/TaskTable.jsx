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

  const thClass = "font-semibold text-white py-3 px-3 lg:py-4 lg:px-4 text-base lg:text-lg";
  const tdClass = "text-white py-3 px-3 lg:py-4 lg:px-4 text-base lg:text-lg";

  return (
    <Table className="text-base lg:text-lg">
      <TableHeader>
        <TableRow>
          <TableHead className={thClass}>{t("task.order_id")}</TableHead>
          <TableHead className={thClass}>{t("task.group")}</TableHead>
          <TableHead className={thClass}>{t("task.model_process_code")}</TableHead>
          <TableHead className={thClass}>{t("task.device_code")}</TableHead>
          <TableHead className={thClass}>{t("task.device_num")}</TableHead>
          <TableHead className={thClass}>{t("task.qr_code")}</TableHead>
          <TableHead className={thClass}>{t("task.status")}</TableHead>
          <TableHead className={thClass}>{t("task.updated_at")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className={`text-center text-gray-400 ${tdClass}`}>
              {t("notification.no_data")}
            </TableCell>
          </TableRow>
        ) : (
          tasks.map((task, index) => (
            <TableRow key={`${task.order_id}-${index}`} className="text-white hover:bg-white/5">
              <TableCell className={tdClass}>{task.order_id}</TableCell>
              <TableCell className={tdClass}>{task.group}</TableCell>
              <TableCell className={tdClass}>{task.model_process_code}</TableCell>
              <TableCell className={tdClass}>{task.device_code}</TableCell>
              <TableCell className={tdClass}>{task.device_num}</TableCell>
              <TableCell className={`max-w-xs truncate ${tdClass}`} title={task.qr_code}>
                {task.qr_code}
              </TableCell>
              <TableCell className={tdClass}>
                <Badge
                  variant="secondary"
                  className={`text-sm lg:text-base px-2.5 py-0.5 border-0 ${
                    task.status === "completed"
                      ? "bg-green-600 hover:bg-green-600 text-white"
                      : task.status === "failed"
                        ? "bg-red-600 hover:bg-red-600 text-white"
                        : task.status === "cancel"
                          ? "bg-gray-500 hover:bg-gray-500 text-white"
                          : "bg-white/20 text-white"
                  }`}
                >
                  {task.status}
                </Badge>
              </TableCell>
              <TableCell className={tdClass}>{task.updated_at}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}