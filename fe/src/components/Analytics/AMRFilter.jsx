import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Bot } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export function AMRFilter({ deviceList = [], selectedDevices = [], onFilterChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState(new Set(selectedDevices));
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(selectedDevices));
    }
  }, [isOpen, selectedDevices]);

  const toggle = (code) => {
    const next = new Set(tempSelected);
    next.has(code) ? next.delete(code) : next.add(code);
    setTempSelected(next);
  };

  const handleSelectAll = () => {
    if (tempSelected.size === deviceList.length) setTempSelected(new Set());
    else setTempSelected(new Set(deviceList.map((d) => d.deviceCode)));
  };

  const handleConfirm = () => {
    onFilterChange(Array.from(tempSelected));
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSelected(new Set(selectedDevices));
    setIsOpen(false);
  };

  const displayText = (() => {
    const count = Array.isArray(selectedDevices) ? selectedDevices.length : 0;
    if (count === 0) return 'Chọn AMR';
    if (count === deviceList.length && count > 0) return 'Tất cả AMR';
    return `${count} AMR đã chọn`;
  })();

  const allSelected = tempSelected.size === deviceList.length && deviceList.length > 0;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg hover:border-[#22BDBD] transition-all duration-200 shadow-sm hover:shadow-md min-w-[280px] justify-between"
      >
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-[#22BDBD]" />
          <span className="font-medium text-gray-700">{displayText}</span>
        </div>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-gray-200">
            <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} id="select-all-amr" />
            <label htmlFor="select-all-amr" className="font-semibold text-sm cursor-pointer">
              {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </label>
          </div>

          <div className="overflow-y-auto flex-1">
            {deviceList.map((d) => {
              const isChecked = tempSelected.has(d.deviceCode);
              return (
                <div
                  key={d.deviceCode}
                  onClick={() => toggle(d.deviceCode)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox checked={isChecked} onCheckedChange={() => toggle(d.deviceCode)} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {d.deviceCode}
                    </p>
                  </div>
                </div>
              );
            })}
            {deviceList.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500">Không có AMR để chọn</div>
            )}
          </div>

          <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleCancel}
              className="flex-1 py-2 px-4 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2 px-4 bg-[#22BDBD] text-white rounded-lg hover:bg-[#1BA8A8] font-medium"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


