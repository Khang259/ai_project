import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import DateRangePicker from "./DateRangePicker";
import { useTranslation } from "react-i18next";

export default function TaskFilter({
    setSearchTaskProperty,
    searchTaskProperty,
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
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                    placeholder={t("searching.search")}
                    value={searchTaskProperty}
                    onChange={(e) => setSearchTaskProperty(e.target.value)}
                    className="pl-10 text-white placeholder:text-gray-400"
                    style={{ border:"none", borderBottom:"1px solid rgb(162, 172, 190)", width:"100%" }}
                />
            </div>


            {/* Date range filter: */}
            <div className="flex items-center gap-2">
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
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

