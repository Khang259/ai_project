// Bộ chọn khoảng ngày + giờ: từ (ngày giờ) → đến (ngày giờ). Lọc data theo full timestamp.
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, ChevronDown } from "lucide-react";

function toDateOnly(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toTimeString(date) {
  if (!date) return "00:00";
  const d = new Date(date);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function parseTime(str) {
  const [h, m] = (str || "00:00").split(":").map(Number);
  return { hours: isNaN(h) ? 0 : h, minutes: isNaN(m) ? 0 : m };
}

// Format Date sang YYYY-MM-DD theo giờ local (tránh nhảy ngày do UTC)
function toDateInputValue(date) {
  if (!date) return "";
  const d = new Date(date);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse chuỗi YYYY-MM-DD thành Date theo giờ local
function parseDateInputValue(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

export function DateTimeRangeFilter({ valueStart, valueEnd, onFilterChange }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [fromDate, setFromDate] = useState(() => (valueStart ? toDateOnly(valueStart) : null));
  const [fromTime, setFromTime] = useState(() => (valueStart ? toTimeString(valueStart) : "00:00"));
  const [toDate, setToDate] = useState(() => (valueEnd ? toDateOnly(valueEnd) : null));
  const [toTime, setToTime] = useState(() => (valueEnd ? toTimeString(valueEnd) : "23:59"));
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (valueStart) {
      setFromDate(toDateOnly(valueStart));
      setFromTime(toTimeString(valueStart));
    } else {
      setFromDate(null);
      setFromTime("00:00");
    }
    if (valueEnd) {
      setToDate(toDateOnly(valueEnd));
      setToTime(toTimeString(valueEnd));
    } else {
      setToDate(null);
      setToTime("23:59");
    }
  }, [valueStart, valueEnd]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDisplay = (date, time) => {
    if (!date) return "";
    const d = new Date(date);
    const dateStr = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
    return `${dateStr} ${time || "00:00"}`;
  };

  const getButtonText = () => {
    if (fromDate && toDate) {
      return `${t('taskManagement.dateTimeFrom')} ${formatDisplay(fromDate, fromTime)} → ${t('taskManagement.dateTimeTo')} ${formatDisplay(toDate, toTime)}`;
    }
    return t('taskManagement.dateTimeSelectRange');
  };

  const buildDateTime = (date, timeStr) => {
    if (!date) return null;
    const d = new Date(date);
    const { hours, minutes } = parseTime(timeStr);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const handleConfirm = () => {
    const start = buildDateTime(fromDate, fromTime);
    const end = buildDateTime(toDate, toTime);
    if (!start || !end) return;
    if (start.getTime() > end.getTime()) {
      onFilterChange(end, start);
    } else {
      onFilterChange(start, end);
    }
    setIsOpen(false);
  };

  const canConfirm = fromDate && toDate;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg hover:border-[#22BDBD] transition-all duration-200 shadow-sm hover:shadow-md min-w-[280px] justify-between text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarClock size={18} className="text-[#22BDBD] shrink-0" />
          <span className="font-medium text-gray-700 truncate">{getButtonText()}</span>
        </div>
        <ChevronDown
          size={18}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[400px] max-w-[480px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600 font-medium">{t('taskManagement.dateTimeHeader')}</p>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{t('taskManagement.dateTimeFrom')}</label>
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="date"
                  value={toDateInputValue(fromDate)}
                  onChange={(e) => setFromDate(parseDateInputValue(e.target.value))}
                  className="flex-1 min-w-[140px] h-10 px-3 rounded-lg border-2 border-gray-200 focus:border-[#22BDBD] focus:outline-none text-gray-800 text-sm"
                />
                <input
                  type="time"
                  value={fromTime}
                  onChange={(e) => setFromTime(e.target.value || "00:00")}
                  className="min-w-[100px] w-28 h-10 px-3 rounded-lg border-2 border-gray-200 focus:border-[#22BDBD] focus:outline-none text-gray-800 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{t('taskManagement.dateTimeTo')}</label>
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="date"
                  value={toDateInputValue(toDate)}
                  onChange={(e) => setToDate(parseDateInputValue(e.target.value))}
                  className="flex-1 min-w-[140px] h-10 px-3 rounded-lg border-2 border-gray-200 focus:border-[#22BDBD] focus:outline-none text-gray-800 text-sm"
                />
                <input
                  type="time"
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value || "23:59")}
                  className="min-w-[100px] w-28 h-10 px-3 rounded-lg border-2 border-gray-200 focus:border-[#22BDBD] focus:outline-none text-gray-800 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 py-2 px-4 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              {t('taskManagement.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 py-2 px-4 bg-[#22BDBD] text-white rounded-lg hover:bg-[#1BA8A8] disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 transition-colors font-medium"
            >
              {t('taskManagement.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
