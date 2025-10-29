import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export function DateFilter({ onFilterChange }) {
  const [mode, setMode] = useState('day'); // 'day', 'week', 'month'
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [confirmedRange, setConfirmedRange] = useState(null); // Đã xác nhận
  const [tempSelectedRange, setTempSelectedRange] = useState(null); // Tạm thời
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date helper
  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  // Get start and end of week
  const getWeekRange = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    const start = new Date(d.setDate(diff));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

  // Get start and end of month
  const getMonthRange = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start, end };
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  // Handle date selection (tạm thời, chưa confirm)
  const handleDateSelect = (day) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

    if (mode === 'day') {
      const tempRange = { start: selected, end: selected };
      setTempSelectedRange(tempRange);
    } else if (mode === 'week') {
      const tempRange = getWeekRange(selected);
      setTempSelectedRange(tempRange);
    }
  };

  // Handle month selection (tạm thời)
  const handleMonthSelect = () => {
    const tempRange = getMonthRange(currentDate);
    setTempSelectedRange(tempRange);
  };

  // Xác nhận - gọi callback
  const handleConfirm = () => {
    if (tempSelectedRange) {
      setConfirmedRange(tempSelectedRange);
      onFilterChange(tempSelectedRange.start, tempSelectedRange.end);
      setIsOpen(false);
    }
  };

  // Hủy - reset và đóng
  const handleCancel = () => {
    setTempSelectedRange(confirmedRange); // Reset về confirmed range
    setIsOpen(false);
  };

  // Change month in calendar
  const changeMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  // Change mode
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setTempSelectedRange(null);
  };

  // Auto-select on month mode
  useEffect(() => {
    if (mode === 'month' && isOpen) {
      handleMonthSelect();
    }
  }, [mode, currentDate, isOpen]);

  // Check if day is selected (dùng temp selection để hiển thị)
  const isDaySelected = (day) => {
    const rangeToCheck = tempSelectedRange || confirmedRange;
    if (!rangeToCheck) return false;
    
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return date >= rangeToCheck.start && date <= rangeToCheck.end;
  };

  // Get selected display text (dùng confirmed range)
  const getSelectedText = () => {
    if (!confirmedRange) return 'Chọn khoảng thời gian';
    
    if (mode === 'day') {
      return formatDate(confirmedRange.start);
    } else if (mode === 'week') {
      return `${formatDate(confirmedRange.start)} - ${formatDate(confirmedRange.end)}`;
    } else {
      return `Tháng ${(confirmedRange.start.getMonth() + 1).toString().padStart(2, '0')}/${confirmedRange.start.getFullYear()}`;
    }
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg hover:border-[#22BDBD] transition-all duration-200 shadow-sm hover:shadow-md min-w-[280px] justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[#22BDBD]" />
          <span className="font-medium text-gray-700">{getSelectedText()}</span>
        </div>
        <ChevronDown 
          size={18} 
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* Mode Selector */}
          <div className="flex gap-1 p-3 bg-gray-50 border-b border-gray-200">
            <button
              onClick={() => handleModeChange('day')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === 'day'
                  ? 'bg-[#22BDBD] text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Ngày
            </button>
            <button
              onClick={() => handleModeChange('week')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === 'week'
                  ? 'bg-[#22BDBD] text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tuần
            </button>
            <button
              onClick={() => handleModeChange('month')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === 'month'
                  ? 'bg-[#22BDBD] text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tháng
            </button>
          </div>

          {/* Calendar */}
          <div className="p-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="font-semibold text-gray-800 text-sm">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>
              <button
                onClick={() => changeMonth(1)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1 }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {/* Actual days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isSelected = isDaySelected(day);
                
                return (
                  <button
                    key={day}
                    onClick={() => mode !== 'month' && handleDateSelect(day)}
                    disabled={mode === 'month'}
                    className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-150 ${
                      isSelected
                        ? 'bg-[#22BDBD] text-white shadow-md'
                        : mode === 'month'
                        ? 'bg-[#F0FDFD] text-[#22BDBD] cursor-default'
                        : 'hover:bg-[#E0F8F8] text-gray-700'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleCancel}
              className="flex-1 py-2 px-4 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={!tempSelectedRange}
              className="flex-1 py-2 px-4 bg-[#22BDBD] text-white rounded-lg hover:bg-[#1BA8A8] disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 transition-colors font-medium"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
