// components/TaskManagement/DateRangePicker.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, isAfter, parse, isValid } from "date-fns";
import { vi } from "date-fns/locale";

const PRESET_RANGES = [
    {
        label: "Hôm nay",
        getValue: () => ({
            start: new Date(),
            end: new Date(),
        }),
    },
    {
        label: "7 ngày qua",
        getValue: () => ({
            start: subDays(new Date(), 6),
            end: new Date(),
        }),
    },
    {
        label: "14 ngày qua",
        getValue: () => ({
            start: subDays(new Date(), 13),
            end: new Date(),
        }),
    },
    {
        label: "30 ngày qua",
        getValue: () => ({
            start: subDays(new Date(), 29),
            end: new Date(),
        }),
    },
    {
        label: "Tháng này",
        getValue: () => ({
            start: startOfMonth(new Date()),
            end: endOfMonth(new Date()),
        }),
    },
];

export default function DateRangePicker({ startDate, endDate, onDateChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [tempStartDate, setTempStartDate] = useState(startDate);
    const [tempEndDate, setTempEndDate] = useState(endDate);

    const handleDateSelect = (date) => {
        if (!tempStartDate || (tempStartDate && tempEndDate)) {
            // Start new selection
            setTempStartDate(date);
            setTempEndDate(null);
        } else if (tempStartDate && !tempEndDate) {
            // Select end date
            if (isAfter(date, tempStartDate) || date.getTime() === tempStartDate.getTime()) {
                setTempEndDate(date);
            } else {
                // If selected date is before start, make it new start
                setTempEndDate(tempStartDate);
                setTempStartDate(date);
            }
        }
    };

    const handlePresetClick = (preset) => {
        const range = preset.getValue();
        setTempStartDate(range.start);
        setTempEndDate(range.end);
    };

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

    const handleClearAll = () => {
        setTempStartDate(null);
        setTempEndDate(null);
        onDateChange(null, null);
        setIsOpen(false);
    };

    const getDaysBetween = () => {
        if (!startDate || !endDate) return null;
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        return days;
    };

    const formatDateRange = () => {
        if (!startDate && !endDate) return "Chọn khoảng thời gian";
        if (startDate && !endDate) {
            return `Từ ${format(startDate, "dd/MM/yyyy", { locale: vi })}`;
        }
        if (!startDate && endDate) {
            return `Đến ${format(endDate, "dd/MM/yyyy", { locale: vi })}`;
        }
        const days = getDaysBetween();
        return `${format(startDate, "dd/MM/yyyy", { locale: vi })} - ${format(endDate, "dd/MM/yyyy", { locale: vi })} (${days} ngày)`;
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
                        className="w-auto min-w-[280px] justify-start text-left font-normal bg-white/5 border-gray-600 hover:bg-white/10 text-white"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDateRange()}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex">
                        {/* Presets Sidebar */}
                        <div className="border-r border-gray-200 p-4 bg-gray-50 min-w-[160px]">
                            <div className="text-sm font-semibold mb-3 text-gray-700">Chọn nhanh</div>
                            <div className="flex flex-col gap-1">
                                {PRESET_RANGES.map((preset) => (
                                    <Button
                                        key={preset.label}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handlePresetClick(preset)}
                                        className="justify-start text-left hover:bg-gray-200"
                                    >
                                        {preset.label}
                                    </Button>
                                ))}
                            </div>

                            {/* Custom Date Inputs */}
                            <div className="mt-4 pt-4 border-t border-gray-300">
                                <div className="text-sm font-semibold mb-3 text-gray-700">Tùy chỉnh</div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-600 mb-1 block">Từ ngày</label>
                                        <div className="flex items-center gap-1">
                                            <Input
                                                type="date"
                                                value={formatDateForInput(tempStartDate)}
                                                onChange={handleStartDateInput}
                                                className="h-8 text-xs"
                                            />
                                            {tempStartDate && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleClearStart}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600 mb-1 block">Đến ngày</label>
                                        <div className="flex items-center gap-1">
                                            <Input
                                                type="date"
                                                value={formatDateForInput(tempEndDate)}
                                                onChange={handleEndDateInput}
                                                className="h-8 text-xs"
                                            />
                                            {tempEndDate && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleClearEnd}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Calendar */}
                        <div className="p-4">
                            <Calendar
                                mode="single"
                                selected={tempStartDate || tempEndDate}
                                onSelect={handleDateSelect}
                                initialFocus
                                modifiers={{
                                    start: tempStartDate,
                                    end: tempEndDate,
                                    range: tempStartDate && tempEndDate ? {
                                        from: tempStartDate,
                                        to: tempEndDate,
                                    } : undefined,
                                }}
                                modifiersClassNames={{
                                    start: "bg-primary text-primary-foreground rounded-l-md",
                                    end: "bg-primary text-primary-foreground rounded-r-md",
                                    range: "bg-primary/20",
                                }}
                            />

                            {/* Selection Info */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="text-sm space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Từ ngày:</span>
                                        <span className="font-medium">
                                            {tempStartDate ? format(tempStartDate, "dd/MM/yyyy", { locale: vi }) : "---"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Đến ngày:</span>
                                        <span className="font-medium">
                                            {tempEndDate ? format(tempEndDate, "dd/MM/yyyy", { locale: vi }) : "---"}
                                        </span>
                                    </div>
                                    {tempStartDate && tempEndDate && (
                                        <div className="flex justify-between items-center pt-1 border-t">
                                            <span className="text-gray-600">Số ngày:</span>
                                            <span className="font-medium text-primary">
                                                {Math.ceil((tempEndDate - tempStartDate) / (1000 * 60 * 60 * 24)) + 1} ngày
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-4 flex gap-2 justify-between">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearAll}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    Xóa tất cả
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                                        Hủy
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleApply}
                                        disabled={!tempStartDate && !tempEndDate}
                                    >
                                        Áp dụng
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {/* External Clear Button */}
            {(startDate || endDate) && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-gray-400 hover:text-white hover:bg-white/10"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}

