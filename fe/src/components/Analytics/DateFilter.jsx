import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export function DateFilter({ onFilterChange }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [step, setStep] = useState('start'); // 'start' | 'end' — đang chọn ngày bắt đầu hay kết thúc
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek };
  };

  // Chỉ cho chọn ngày trong quá khứ (không chọn hôm nay và tương lai)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const isFutureOrToday = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    return date.getTime() >= todayStart.getTime();
  };

  const handleDateSelect = (day) => {
    if (isFutureOrToday(day)) return;
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

    if (step === 'start') {
      setStartDate(selected);
      setEndDate(null);
      setStep('end');
    } else {
      // step === 'end'
      if (startDate && selected < startDate) {
        setEndDate(startDate);
        setStartDate(selected);
      } else {
        setEndDate(selected);
      }
      setStep('start');
    }
  };

  const handleConfirm = () => {
    if (startDate && endDate) {
      onFilterChange(startDate, endDate);
      setIsOpen(false);
    } else if (startDate && !endDate) {
      onFilterChange(startDate, startDate);
      setEndDate(startDate);
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const changeMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const isInRange = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    if (!startDate || !endDate) return false;
    const d = date.getTime();
    const s = startDate.getTime();
    const e = endDate.getTime();
    return d >= s && d <= e;
  };

  const isStart = (day) => {
    if (!startDate) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return date.toDateString() === startDate.toDateString();
  };

  const isEnd = (day) => {
    if (!endDate) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return date.toDateString() === endDate.toDateString();
  };

  const getSelectedText = () => {
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    if (startDate) {
      return `${formatDate(startDate)} - ${t('analytics.selectEndDate')}`;
    }
    return t('analytics.selectTimeRange');
  };

  const canConfirm = !!startDate;

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
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

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              {step === 'start' ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc'}
            </p>
          </div>

          <div className="p-4">
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

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1 }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const inRange = isInRange(day);
                const start = isStart(day);
                const end = isEnd(day);
                const highlighted = inRange || start || end;

                const disabled = isFutureOrToday(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    disabled={disabled}
                    className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-150 ${
                      disabled
                        ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                        : start || end
                          ? 'bg-[#22BDBD] text-white shadow-md'
                          : inRange
                            ? 'bg-[#E0F8F8] text-[#22BDBD]'
                            : 'hover:bg-[#E0F8F8] text-gray-700'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleCancel}
              className="flex-1 py-2 px-4 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
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
