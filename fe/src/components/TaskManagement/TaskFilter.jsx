import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import DateRangePicker from "./DateRangePicker";
import { useTranslation } from "react-i18next";

export default function TaskFilter({
    orderIdFilter,
    setOrderIdFilter,
    deviceNumFilter,
    setDeviceNumFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    onReset,
}) {
    const handleDateChange = (start, end) => {
        setStartDate(start);
        setEndDate(end);
    };
    const { t } = useTranslation();

    return (
        <div className="flex flex-col-2 justify-between mb-6 text-white">
            {/* Order ID filter: */}
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                    placeholder={t("searching.task-order_id")}
                    value={orderIdFilter}
                    onChange={(e) => setOrderIdFilter(e.target.value)}
                    className="pl-10 bg-white/5 border-gray-600 text-white placeholder:text-gray-400"
                />
            </div>

            {/* Device Number filter: */}
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="searching.device-num"
                    value={deviceNumFilter}
                    onChange={(e) => setDeviceNumFilter(e.target.value)}
                    className="pl-10 bg-white/5 border-gray-600 text-white placeholder:text-gray-400"
                />
            </div>

            {/* Date range filter: */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300 whitespace-nowrap">{t("searching.task-date")}:</span>
                <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onDateChange={handleDateChange}
                />
            </div>

            {/* Reset button: */}
            <Button
                variant="ghost"
                onClick={onReset}
                className="text-gray-300 hover:text-white hover:bg-white/10 w-fit"
            >
                <X className="mr-2 h-4 w-4" />
                {t("searching.reset")}
            </Button>
        </div>
    );
}

