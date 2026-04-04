// src/components/RobotTable.jsx
import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRobotTableWS } from '@/hooks/Dashboard/useRobotTableWS';
import { useArea } from '@/contexts/AreaContext';

// Ngưỡng pin yếu (%) – có thể đổi tại đây hoặc sau này đọc từ config/API
const LOW_BATTERY_THRESHOLD = 40;

// Chuẩn hóa state từ WS (InTask, Idle, Charging, ...) sang key dùng cho đếm
function normalizeState(state) {
  const s = String(state || '').trim();
  if (/InTask/i.test(s)) return 'in_task';
  if (/Idle/i.test(s)) return 'idle';
  if (/Charg(e|ing)/i.test(s)) return 'charging';
  return 'offline';
}

// Laptop & nhỏ hơn: chữ như ban đầu; Desktop (xl): chữ to; TV (3840px): chữ to hơn nữa
const FONT_LAPTOP = { font: 'clamp(0.7rem, 1.2vw, 1.1rem)', title: 'clamp(0.9rem, 1.8vw, 1.5rem)', status: 'clamp(0.85rem, 1.5vw, 1.25rem)' };
const FONT_DESKTOP = { font: 'clamp(0.85rem, 1.6vw, 1.35rem)', title: 'clamp(1.1rem, 2.2vw, 1.75rem)', status: 'clamp(1rem, 1.9vw, 1.5rem)' };
const FONT_TV = { font: '1.5rem', title: '2rem', status: '1.75rem' };

const DEFAULT_INFO = { total: 0, in_task: 0, idle: 0, charging: 0, low_battery: 0, offline: 0 };

const RobotTable = () => {
  const { t } = useTranslation();
  const { currDashboardGroupId } = useArea();
  const { data, isConnected, error } = useRobotTableWS();
  const lastRobotsRef = useRef([]);
  const lastExtendedInfoRef = useRef({ ...DEFAULT_INFO });
  const [isXlOrLarger, setIsXlOrLarger] = useState(false);
  const [isTV, setIsTV] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1280px)');
    const onChange = () => setIsXlOrLarger(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  useEffect(() => {
    const tv = window.matchMedia('(min-width: 3840px)');
    const onChange = () => setIsTV(tv.matches);
    onChange();
    tv.addEventListener('change', onChange);
    return () => tv.removeEventListener('change', onChange);
  }, []);
  const fonts = isTV ? FONT_TV : (isXlOrLarger ? FONT_DESKTOP : FONT_LAPTOP);
  const responsiveFont = fonts.font;
  const responsiveTitle = fonts.title;
  const statusFont = fonts.status;

  // Xử lý dữ liệu từ WebSocket + lọc theo tuyến (PA/MS trong tên robot)
  const robots = React.useMemo(() => {
    if (!data) return [];
    if (data.data && Array.isArray(data.data)) {
      let list = data.data
        .map((item) => ({
          id: item.device_code || 'Unknown',
          name: item.device_name || 'Unknown',
          speed: item.speed || 0,
          battery: item.battery ?? 0,
          state: normalizeState(item.state),
        }))
        .sort((a, b) => {
          const getPriority = (val) => {
            if (val > 0 && val < LOW_BATTERY_THRESHOLD) return 1;
            if (val >= LOW_BATTERY_THRESHOLD) return 2;
            return 3;
          };
          const priorityA = getPriority(a.battery);
          const priorityB = getPriority(b.battery);
          if (priorityA !== priorityB) return priorityA - priorityB;
          return a.battery - b.battery;
        });

      // Lọc theo tuyến đã chọn: PA trong tên -> tuyến PA (group 4), MS trong tên -> tuyến MS (group 2)
      if (currDashboardGroupId === 2) {
        list = list.filter((r) => String(r.name || '').toUpperCase().includes('MS'));
      } else if (currDashboardGroupId === 4) {
        list = list.filter((r) => String(r.name || '').toUpperCase().includes('PA'));
      }
      return list;
    }
    return [];
  }, [data, currDashboardGroupId]);

  const info = React.useMemo(() => {
    if (!data?.info) return null;
    return data.info;
  }, [data]);

  // Giữ hiển thị dữ liệu cũ đến khi có dữ liệu mới, tránh nháy "Không có dữ liệu"
  if (robots.length > 0) lastRobotsRef.current = robots;
  const displayRobots = robots.length > 0 ? robots : lastRobotsRef.current;

  const getSpeedStyle = (speed) => {
    if (speed > 0) return { backgroundColor: '#10b981', color: 'white' };
    return { backgroundColor: '#ef4444', color: 'white' };
  };


  const getProgressColor = (percent) => {
    if (percent >= 70) return '#10b981';
    if (percent >= 30) return '#f59e0b';
    return '#ef4444';
  };

  const lowBatteryCount = React.useMemo(() => {
    return robots.filter((r) => r.battery > 0 && r.battery < LOW_BATTERY_THRESHOLD).length;
  }, [robots]);

  // Khi chọn tuyến (PA/MS): đếm toàn bộ từ danh sách đã lọc theo state (InTask->Đang chạy, Idle->Nhàn rỗi, Charging->Đang sạc, còn lại->Offline), pin < 40% -> Pin yếu
  const extendedInfo = React.useMemo(() => {
    if (!info) return null;
    const isFiltered = currDashboardGroupId === 2 || currDashboardGroupId === 4;
    if (isFiltered) {
      const in_task = robots.filter((r) => r.state === 'in_task').length;
      const idle = robots.filter((r) => r.state === 'idle').length;
      const charging = robots.filter((r) => r.state === 'charging').length;
      const offline = robots.filter((r) => r.state === 'offline').length;
      return {
        total: robots.length,
        in_task,
        idle,
        charging,
        offline,
        low_battery: lowBatteryCount,
      };
    }
    return {
      ...info,
      low_battery: lowBatteryCount,
    };
  }, [info, lowBatteryCount, robots, currDashboardGroupId]);

  // Luôn dùng một object để hiển thị: có data mới thì cập nhật ref và dùng data, không thì giữ số cũ → không unmount/remount khối badge, chỉ đổi số
  const displayInfo = React.useMemo(() => {
    if (extendedInfo) {
      lastExtendedInfoRef.current = extendedInfo;
      return extendedInfo;
    }
    return lastExtendedInfoRef.current;
  }, [extendedInfo]);

  const STATUS_CONFIG = {
    total: { label: t('robotTable.total'), color: '#38bdf8' },
    in_task: { label: t('robotTable.running'), color: '#10b981' },
    idle: { label: t('robotTable.idle'), color: '#f59e0b' },
    charging: { label: t('robotTable.charging'), color: '#8b5cf6' },
    low_battery: { label: t('robotTable.lowBattery'), color: '#ec4899' },
    offline: { label: t('robotTable.offline'), color: '#ef4444' },
  };

  const statusGap = isTV ? '12px' : (isXlOrLarger ? '6px' : '4px');
  const statusMinHeight = isTV ? '80px' : (isXlOrLarger ? 'clamp(40px, 7vw, 64px)' : 'clamp(36px, 6vw, 56px)');
  const statusMarginBottom = isTV ? '16px' : (isXlOrLarger ? '8px' : '6px');
  const badgeGap = isTV ? '12px' : (isXlOrLarger ? '8px' : '6px');
  const badgePadding = isTV ? '12px 20px' : (isXlOrLarger ? '6px 12px' : '4px 10px');
  const speedPillPadding = isTV ? '8px 16px' : (isXlOrLarger ? '4px 10px' : '2px 6px');
  const batteryPercentMinWidth = isTV ? '48px' : (isXlOrLarger ? 'clamp(28px, 4vw, 36px)' : 'clamp(22px, 3vw, 28px)');
  const batteryBarHeight = isTV ? '14px' : (isXlOrLarger ? '8px' : '6px');
  const batteryCellGap = isTV ? '12px' : '6px';

  return (
    <div
      className="h-full flex flex-col min-h-0 overflow-hidden px-2 py-1.5 lg:px-3 lg:py-2 xl:px-3 fullhd:px-4 fullhd:py-3 tv:px-6 tv:py-5"
      style={{
        width: '100%',
        fontFamily: 'Arial, sans-serif',
        color: '#e2e8f0',
        ...(isTV && { padding: '20px 24px' }),
      }}
    >
      <h2
        className="shrink-0"
        style={{
          textAlign: 'left',
          color: '#ffffff',
          fontSize: responsiveTitle,
          fontWeight: 'bold',
          paddingBottom: isTV ? '10px' : '4px',
        }}
      >
        {t('robotTable.title')}
        {!isConnected && (
          <span style={{ fontSize: responsiveFont, color: '#f59e0b', marginLeft: isTV ? '12px' : '6px' }}>
            ({t('robotTable.connecting')})
          </span>
        )}
      </h2>

      {/* INFO STATUS - luôn hiển thị, chỉ cập nhật số khi có data mới (không vẽ lại khối) */}
      <div
        className="shrink-0"
        style={{
          display: 'flex',
          gap: statusGap,
          minHeight: statusMinHeight,
          flexWrap: 'wrap',
          marginBottom: statusMarginBottom,
        }}
      >
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: badgeGap,
              padding: badgePadding,
              borderRadius: isTV ? '12px' : '8px',
              backgroundColor: `${cfg.color}22`,
              color: cfg.color,
              fontSize: statusFont,
              fontWeight: '700',
              lineHeight: 1.2,
              letterSpacing: '0.02em',
            }}
          >
            <span>{cfg.label}:</span>
            <span>{displayInfo[key] ?? 0}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="shrink-0" style={{ padding: isTV ? '12px' : '6px', backgroundColor: '#ef4444', color: 'white', borderRadius: '4px', marginBottom: '8px', fontSize: responsiveFont }}>
          {t('robotTable.error')}: {error}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'transparent' }}>
            <tr>
              <th style={{ ...getThStyle(responsiveFont, isTV), paddingRight: isTV ? '8px' : '2px' }}>{t('robotTable.robotName')}</th>
              <th style={{ ...getThStyle(responsiveFont, isTV), paddingLeft: isTV ? '8px' : '2px' }}>{t('robotTable.id')}</th>
              <th style={{ ...getThStyle(responsiveFont, isTV), textAlign: 'left', verticalAlign: 'middle' }}>{t('robotTable.speed')}</th>
              <th style={getThStyle(responsiveFont, isTV)}>{t('robotTable.battery')}</th>
            </tr>
          </thead>
          <tbody>
            {displayRobots.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ ...getTdStyle(responsiveFont, isTV), textAlign: 'center', color: '#94a3b8' }}>
                  {t('robotTable.noData')}
                </td>
              </tr>
            ) : (
              displayRobots.map((robot) => (
              <tr key={robot.id}>
                <td style={{ ...getTdStyle(responsiveFont, isTV), paddingRight: isTV ? '8px' : '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {robot.name}
                  </div>
                </td>

                <td
                  style={{
                    ...getTdStyle(responsiveFont, isTV),
                    paddingLeft: isTV ? '8px' : '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '1px',
                  }}
                  title={robot.id}
                >
                  {robot.id}
                </td>

                <td style={{ ...getTdStyle(responsiveFont, isTV), textAlign: 'left', verticalAlign: 'middle' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: speedPillPadding,
                      borderRadius: '999px',
                      fontSize: responsiveFont,
                      fontWeight: 'bold',
                      ...getSpeedStyle(robot.speed),
                    }}
                  >
                    {(robot.speed / 1000).toFixed(1)} m/s
                  </span>
                </td>

                <td style={getTdStyle(responsiveFont, isTV)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: batteryCellGap }}>
                    <span style={{ minWidth: batteryPercentMinWidth, fontWeight: 'bold', fontSize: responsiveFont }}>
                      {robot.battery}%
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: batteryBarHeight,
                        backgroundColor: '#334155',
                        borderRadius: isTV ? '8px' : '5px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${robot.battery}%`,
                          backgroundColor: getProgressColor(robot.battery),
                          borderRadius: '3px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const getThStyle = (fontSize, isTV) => ({
  padding: isTV ? '10px 12px' : '4px 6px',
  textAlign: 'left',
  color: '#cbd5e1',
  fontWeight: 'bold',
  fontSize,
  borderBottom: isTV ? '2px solid #334155' : '1px solid #334155',
});

const getTdStyle = (fontSize, isTV) => ({
  padding: isTV ? '10px 12px' : '2px 6px',
  fontSize,
  borderBottom: isTV ? '2px solid #334155' : '1px solid #334155',
});

export default RobotTable;