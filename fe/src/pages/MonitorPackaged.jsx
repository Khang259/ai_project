import React, { useState, useEffect } from 'react';
import bgMonitorImage from '../assets/bg8.jpg';

// 1. DỮ LIỆU (Data)
// Tách riêng dữ liệu để dễ dàng cập nhật
const lineData = [
  {
    name: 'LINE 2',
    color: '#008FBF', // Electric Blue (tối hơn)
    boxes: [
      { id: 1, text: '' },
      { id: 2, text: 'L2CD-2c/d' },
      { id: 3, text: 'L2CD-3d/e' },
      { id: 4, text: 'L2CD-4a/b' },
    ],
  },
  {
    name: 'LINE 3',
    color: '#772EBF', // Violet (tối hơn)
    boxes: [
      { id: 1, text: '' },
      { id: 2, text: '' },
      { id: 3, text: '' },
      { id: 4, text: '' },
    ],
  },
  {
    name: 'LINE 4',
    color: '#AC0090', // Fuchsia (tối hơn)
    boxes: [
      { id: 1, text: 'L4CD-1b/c' },
      { id: 2, text: 'L4CD-2e' },
      { id: 3, text: 'L4CD-3d/e' },
      { id: 4, text: '' },
    ],
  },
];

// 2. CÁC COMPONENT CON (Child Components)

// Component cho phần Header
const MonitorHeader = ({ date, time }) => (
  <header className="monitor-header">
    <div className="header-left">
      THADOSOFT
    </div>
    <div className="header-center">
      <div className="title-frame">
        Monitor Storage System
      </div>
    </div>
    <div className="header-right">
      <div>{date}</div>
      <div>{time}</div>
    </div>
  </header>
);

// Component cho một ô (box)
const StorageBox = ({ id, text }) => (
  <div className="storage-box">
    <span className="box-id">{id}</span>
    <span className="box-text">{text}</span>
  </div>
);

// Component cho một hàng (line)
const StorageLine = ({ name, color, boxes }) => (
  <div className="storage-line" style={{ '--line-color': color }}>
    <h2 className="line-name">{name}</h2>
    <div className="box-container">
      {boxes.map((box) => (
        <StorageBox
          key={box.id}
          id={box.id}
          text={box.text}
        />
      ))}
    </div>
  </div>
);

// 3. COMPONENT CHÍNH (Main Component)
const MonitorPackaged = () => {
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  // Hàm format ngày theo DD/MM/YYYY
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Hàm format giờ theo hh:mm:ss
  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Cập nhật thời gian mỗi giây
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(formatDate(now));
      setCurrentTime(formatTime(now));
    };

    // Cập nhật ngay lập tức
    updateDateTime();

    // Cập nhật mỗi giây
    const interval = setInterval(updateDateTime, 1000);

    // Cleanup interval khi component unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Nhúng CSS trực tiếp vào file JSX cho tiện lợi */}
      <style>{`
        /* --- Global Styles --- */
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', 'Arial', sans-serif;
          background-color: #0a0a1a; /* Màu nền tối mô phỏng */
          color: #ffffff;
        }

        .monitor-container {
          width: 100%;
          height: 100vh;
          padding: 10px;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: fixed;
        }

        /* --- Header Styles --- */
        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          color: white;
          margin-bottom: 10px;
          flex-shrink: 0;
          border-radius: 15px;
          background-image: linear-gradient(
            90deg,
            #008FBF,
            #772EBF,
            #AC0090
          );
        }

        .header-left {
          font-size: 2.1rem;
          font-weight: bold;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1;
        }

        .post-text {
          font-size: 0.8rem;
          font-weight: normal;
          margin-left: 15px;
        }

        .header-center {
          flex-grow: 1;
          text-align: center;
        }

        .title-frame {
          display: inline-block;
          padding: 10px 30px;
          font-size: 2.4rem;
          font-weight: bold;
        }

        .header-right {
          text-align: right;
          font-size: 1.9rem;
          font-family: 'Courier New', 'Monaco', 'Consolas', monospace;
          font-weight: bold;
          letter-spacing: 1px;
        }

        /* --- Content Styles --- */
        .main-content {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
          overflow: hidden;
        }

        .storage-line {
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .line-name {
          font-size: 1.2rem;
          font-weight: bold;
          color: #eee;
          margin-bottom: 5px;
          margin-left: 10px;
          margin-top: 0;
          flex-shrink: 0;
          text-transform: uppercase;
        }

        .box-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr); /* Tạo lưới 4 cột */
          gap: 8px;
          flex: 1;
          min-height: 0;
        }

        .storage-box {
          border-radius: 8px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
          max-height: 100%;
          background-image: linear-gradient(to bottom, var(--line-color), color-mix(in srgb, var(--line-color) 70%, black));
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow: 0 0 15px var(--line-color), inset 0 0 8px rgba(255, 255, 255, 0.5);
          aspect-ratio: auto;
        }
        
        .storage-box:hover {
            transform: translateY(-5px) scale(1.02);
            box-shadow: 0 8px 25px var(--line-color), inset 0 0 12px rgba(255, 255, 255, 0.7);
        }

        .box-id {
          position: absolute;
          top: 5px;
          font-size: 1.8rem;
          color: rgba(255, 255, 255, 0.8);
          opacity: 0.9;
          font-weight: bold;
        }

        .box-text {
          font-size: 2.5vw; /* Kích thước chữ co dãn theo màn hình */
          font-weight: bold;
          color: #FFFFFF; /* Chữ màu trắng */
          text-align: center;
        }

        /* Responsive cho thiết bị di động */
        @media (max-width: 768px) {
          .box-container {
            grid-template-columns: 1fr; /* 1 cột trên di động */
          }

          .box-text {
            font-size: 6vw; /* Chữ to hơn trên di động */
          }

          .monitor-header {
            flex-direction: column;
            gap: 15px;
          }

          .title-frame {
            font-size: 1.2rem;
            padding: 8px 20px;
          }
        }
      `}</style>

      {/* Phần render chính */}
      <div 
        className="monitor-container"
        style={{
          backgroundImage: `url(${bgMonitorImage})`
        }}
      >
        <MonitorHeader date={currentDate} time={currentTime} />
        <main className="main-content">
          {lineData.map((line) => (
            <StorageLine
              key={line.name}
              name={line.name}
              color={line.color}
              boxes={line.boxes}
            />
          ))}
        </main>
      </div>
    </>
  );
};

export default MonitorPackaged;