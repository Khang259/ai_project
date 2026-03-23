// components/TaskManagement/DateRangePicker.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format, isValid } from "date-fns";
import { vi } from "date-fns/locale";
import { useTranslation } from "react-i18next";


export default function DateRangePicker({ startDate, endDate, onDateChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [tempStartDate, setTempStartDate] = useState(startDate);
    const [tempEndDate, setTempEndDate] = useState(endDate);
    const { t } = useTranslation();
    const handleStartDateInput = (e) => {
        const value = e.target.value;
        if (value) {
            const date = new Date(value);
            if (isValid(date)) {
                setTempStartDate(date);
            }
        } else {
            setTempStartDate(null);
        }
    };

    const handleEndDateInput = (e) => {
        const value = e.target.value;
        if (value) {
            const date = new Date(value);
            if (isValid(date)) {
                setTempEndDate(date);
            }
        } else {
            setTempEndDate(null);
        }
    };

    const handleClearStart = () => {
        setTempStartDate(null);
    };

    const handleClearEnd = () => {
        setTempEndDate(null);
    };

    const handleApply = () => {
        onDateChange(tempStartDate, tempEndDate);
        setIsOpen(false);
    };

    const handleCancel = () => {
        setTempStartDate(startDate);
        setTempEndDate(endDate);
        setIsOpen(false);
    };

    const getDaysBetween = () => {
        if (!startDate || !endDate) return null;
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const AbsDays = Math.abs(days);;
        return AbsDays;
    };

    const formatDateRange = () => {
        if (!startDate && !endDate) return t("taskManagement.selectTimeRange");
        if (startDate && !endDate) {
            return `${t("taskManagement.fromDate")} ${format(startDate, "dd/mm/yyyy", { locale: vi })}`;
        }
        if (!startDate && endDate) {
            return `${t("taskManagement.toDate")} ${format(endDate, "dd/mm/yyyy", { locale: vi })}`;
        }
        const AbsDays = getDaysBetween();
        return `${AbsDays} ${t("taskManagement.days")})`;
    };

    const formatDateForInput = (date) => {
        if (!date) return "";
        return format(date, "yyyy-MM-dd");
    };

    return (
        <div className="flex items-center gap-2">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-auto min-w-[280px] lg:min-w-[300px] justify-start text-left font-normal bg-white/5 border-gray-600 hover:bg-white/10 text-white text-base lg:text-lg h-11 lg:h-12"
                    >
                        <CalendarIcon className="mr-2 h-5 w-5" />
                        {formatDateRange()}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex glass">
                        {/* Presets Sidebar */}
                        
                        <div className="border-r border-gray-200 p-4 min-w-[180px] lg:min-w-[200px]">
                            <div className="">
                                <span className="text-lg lg:text-xl font-semibold mb-3 text-gray-700">{t("taskManagement.custom")}</span>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm text-gray-600 mb-1 block">{t("taskManagement.from-date")}</label>
                                        <div className="flex items-center gap-1">
                                            <Input
                                                type="date"
                                                value={formatDateForInput(tempStartDate)}
                                                onChange={handleStartDateInput}
                                                className="h-9 lg:h-10 text-sm lg:text-base"
                                            />
                                            {tempStartDate && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleClearStart}
                                                    className="h-9 w-9 lg:h-10 lg:w-10 p-0"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-600 mb-1 block">{t("taskManagement.to-date")}</label>
                                        <div className="flex items-center gap-1">
                                            <Input
                                                type="date"
                                                value={formatDateForInput(tempEndDate)}
                                                onChange={handleEndDateInput}
                                                className="h-9 lg:h-10 text-sm lg:text-base"
                                            />
                                            {tempEndDate && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleClearEnd}
                                                    className="h-9 w-9 lg:h-10 lg:w-10 p-0"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Calendar */}
                        
                        <div className="p-4">
                            {/* Selection Info */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="text-sm lg:text-base space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">{t("taskManagement.from-date")}:</span>
                                        <span className="font-medium">
                                            {tempStartDate ? format(tempStartDate, "dd/MM/yyyy", { locale: vi }) : "---"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">{t("taskManagement.to-date")}:</span>
                                        <span className="font-medium">
                                            {tempEndDate ? format(tempEndDate, "dd/MM/yyyy", { locale: vi }) : "---"}
                                        </span>
                                    </div>
                                    {tempStartDate && tempEndDate && (
                                        <div className="flex justify-between items-center pt-1 border-t">
                                            <span className="text-gray-600">{t("taskManagement.number-of-days")}:</span>
                                            <span className="font-medium text-primary">
                                                {Math.abs((tempEndDate - tempStartDate) / (1000 * 60 * 60 * 24)) + 1} {t("taskManagement.days")}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-4 flex gap-2 justify-between">
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" className="text-sm lg:text-base h-9 lg:h-10" onClick={handleCancel}>
                                        {t("taskManagement.cancel")}
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="text-sm lg:text-base h-9 lg:h-10"
                                        onClick={handleApply}
                                        disabled={!tempStartDate && !tempEndDate}
                                    >
                                        {t("taskManagement.apply")}
                                    </Button>
                                </div>
                            </div>
                        </div>

                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

