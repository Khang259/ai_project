/* Ý tưởng để clear Monitor khi huỷ lệnh trên frontend:
 Cần 2 thao tác:
 1. Huỷ lệnh trên RCS 
*/
import React, { useState, useEffect, useRef } from 'react';
import logoImage from '../assets/logo_cty.png';

// API configuration
const API_HTTP_URL = import.meta.env.VITE_API_URL || 'http://localhost:6868';
const WS_BASE_URL = API_HTTP_URL.replace(/^http/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws'));

// 1. DỮ LIỆU (Data)
// Cấu trúc ban đầu cho các lines
const initialLineData = [
  {
    name: 'LINE 2',
    color: '#008FBF', // Electric Blue (tối hơn)
    boxes: [
      { id: 1, text: '' },
      { id: 2, text: '' },
      { id: 3, text: '' },
      { id: 4, text: '' },
    ],
  },
  {
    name: 'LINE 3',
    color: '#035575',
    boxes: [
      { id: 1, text: '' },
      { id: 2, text: '' },
      { id: 3, text: '' },
      { id: 4, text: '' },
    ],
  },
  {
    name: 'LINE 4',
    color: '#002C3A',
    boxes: [
      { id: 1, text: '' },
      { id: 2, text: '' },
      { id: 3, text: '' },
      { id: 4, text: '' },
    ],
  },
];

// Config cứng cho mapping end_qrs -> node_name
const END_QRS_NODE_CONFIG = {
  end_qrs: {
    node_name: {
     10000296: 'L2_CD-1a',
     10000295: 'L2_CD-1b/c',
     10000294: 'L2_CD-2a/b',
     10000299: 'L2_CD-2c/d',
     10001122: 'L2_CD-2e',
     10001121: 'L2_CD-3a',
     10000388: 'L2_CD-3b/c',
     10000384: 'L2_CD-4a/b',
     10000385: 'L2_CD-4c',
     10000383: 'L2_CD-3d/e',
     10000350: 'L3_CD-1a',
     10000534: 'L3_CD-3c',
     10001119: 'L3_CD-3a',
     10000462: 'L3_CD-3b',
     10000077: 'L4_CD-1b/c',
     10000048: 'L4_CD-3b/c',
     10000349: 'L3_CD-1b/c',
     10000076: 'L4_CD-2a/b',
     10000043: 'L4_CD-3d/e',
     10000348: 'L3_CD-2a/b',
     10000469: 'L3_CD-4a/b',
     10000081: 'L4_CD-2c/d',
     10000044: 'L4_CD-4a/b',
     10000353: 'L3_CD-2c/d',
     10000470: 'L3_CD-4c',
     10001118: 'L4_CD-2e',
     10000045: 'L4_CD-4c', 
     10001120: 'L3_CD-2e',
     10000078: 'L4_CD-1a',
     10001117: 'L4_CD-3a'
    },
  },
};

// 2. CÁC COMPONENT CON (Child Components)

// Component cho phần Header
const MonitorHeader = ({ date, time, groupId }) => (
  <header className="monitor-header">
    {/* <div className="header-left">
      THADOSOFT
      {groupId && (
        <span className="group-badge">Group: {groupId}</span>
      )}
    </div> */}
    <div className="header-left">
      <img src={logoImage} alt="Logo" className="logo-image" />
      {groupId && (
        <span className="group-badge">Group: {groupId}</span>
      )}
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

// Component cho một ô (box) - Dùng data-line và data-box để DOM manipulation
const StorageBox = ({ lineIndex, boxId }) => (
  <div 
    className="storage-box" 
    data-line={lineIndex} 
    data-box={boxId}
  >
    <div className="dots_border"></div>
    <span className="box-id">{boxId}</span>
    <span className="box-text" data-content></span>
  </div>
);

// Component cho một hàng (line)
const StorageLine = ({ name, color, boxes, lineIndex }) => (
  <div className="storage-line" style={{ '--line-color': color }}>
    <h2 className="line-name">{name}</h2>
    <div className="box-container">
      {boxes.map((box) => (
        <StorageBox
          key={box.id}
          lineIndex={lineIndex}
          boxId={box.id}
        />
      ))}
    </div>
  </div>
);

// 3. COMPONENT CHÍNH (Main Component)
const MonitorPackaged = () => {
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  // Stack/Array để lưu trữ nhiều giá trị cho mỗi ô grid
  // Format: { "lineIndex-boxId": ["value1", "value2", ...] }
  const [boxDataStacks, setBoxDataStacks] = useState({});
  
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // Lấy group_id từ URL params
  const urlParams = new URLSearchParams(window.location.search);
  const initialGroupId = urlParams.get('group_id') || '1';
  
  // console.log('╔═══════════════════════════════════════════════════════════════╗');
  // console.log('║           MonitorPackaged Component Started                  ║');
  // console.log('╚═══════════════════════════════════════════════════════════════╝');
  // console.log("[MonitorPackaged] 🔑 Initial connection group_id:", initialGroupId);
  // console.log('');
  
  // ==================== DOM MANIPULATION FUNCTIONS ====================
  
  /**
   * Push data vào Stack của ô và render phần tử ĐẦU TIÊN (FIFO)
   * Logic: Stack lưu nhiều giá trị, luôn hiển thị phần tử đầu tiên (index 0)
   */
  const updateBoxContent = (lineIndex, boxId, content, isActive = false) => {
    const key = `${lineIndex}-${boxId}`;
    
    // Push vào cuối Stack
    setBoxDataStacks(prev => {
      const currentStack = prev[key] || [];
      const newStack = [...currentStack, content];
      
      console.log(`[STACK] Push "${content}" to [L${lineIndex + 2}, Box${boxId}]`);
      console.log(`[STACK] Stack now: [${newStack.join(', ')}]`);
      
      // Render phần tử ĐẦU TIÊN trong stack (không phải phần tử vừa push)
      const displayValue = newStack[0]; // Luôn lấy phần tử đầu
      console.log(`[STACK] Display FIRST element: "${displayValue}"`);
      
      // Update DOM
      const boxElement = document.querySelector(
        `.storage-box[data-line="${lineIndex}"][data-box="${boxId}"]`
      );
      
      if (boxElement) {
        const textElement = boxElement.querySelector('[data-content]');
        if (textElement) {
          textElement.innerHTML = displayValue || '';
        }
        
        // Toggle active class
        if (isActive) {
          boxElement.classList.add('active');
        } else {
          boxElement.classList.remove('active');
        }
        
        console.log(`[DOM] ✓ Display: "${displayValue}" at Line ${lineIndex + 2}, Box ${boxId}`);
      } else {
        console.warn(`[DOM] ✗ Box not found: Line ${lineIndex}, Box ${boxId}`);
      }
      
      return {
        ...prev,
        [key]: newStack
      };
    });
  };

  /**
   * Xóa một giá trị cụ thể khỏi Stack và render lại phần tử ĐẦU TIÊN (FIFO)
   * Nếu valueToRemove không được cung cấp -> xóa toàn bộ stack
   */
  const clearBox = (lineIndex, boxId, valueToRemove = null) => {
    const key = `${lineIndex}-${boxId}`;
    
    setBoxDataStacks(prev => {
      const currentStack = prev[key] || [];
      
      let newStack;
      
      if (valueToRemove === null) {
        // Không có giá trị cụ thể -> Xóa toàn bộ stack
        newStack = [];
        console.log(`[STACK] Clear ALL from [L${lineIndex + 2}, Box${boxId}]`);
      } else {
        // Xóa giá trị cụ thể khỏi stack
        newStack = currentStack.filter(item => item !== valueToRemove);
        console.log(`[STACK] Remove "${valueToRemove}" from [L${lineIndex + 2}, Box${boxId}]`);
        // console.log(`[STACK] Stack was: [${currentStack.join(', ')}]`);
        // console.log(`[STACK] Stack now: [${newStack.join(', ')}]`);
      }
      
      // Render lại phần tử ĐẦU TIÊN (hoặc rỗng nếu stack trống)
      const boxElement = document.querySelector(
        `.storage-box[data-line="${lineIndex}"][data-box="${boxId}"]`
      );
      
      if (boxElement) {
        const textElement = boxElement.querySelector('[data-content]');
        if (textElement) {
          // Lấy phần tử ĐẦU TIÊN thay vì cuối
          const firstValue = newStack.length > 0 ? newStack[0] : '';
          textElement.innerHTML = firstValue;
          // console.log(`[DOM] ✓ Re-render FIRST element: "${firstValue}" at Line ${lineIndex + 2}, Box ${boxId}`);
        }
        
        // Xóa active class nếu stack rỗng
        if (newStack.length === 0) {
          boxElement.classList.remove('active');
        }
      }
      
      return {
        ...prev,
        [key]: newStack
      };
    });
  };

  /**
   * Clear box dựa trên end_qrs
   * Map end_qrs -> node_name -> parse để lấy lineIndex và boxId
   * Xóa node_name cụ thể khỏi stack của ô đó
   */
  const clearBoxByEndQrs = (endQrs) => {
    if (!endQrs && endQrs !== 0) {
      console.warn('[DOM] Invalid end_qrs:', endQrs);
      return;
    }

    // Lấy node_name từ config
    const nodeName = END_QRS_NODE_CONFIG.end_qrs.node_name[endQrs];
    
    if (!nodeName) {
      console.warn(`[DOM] No node_name mapping found for end_qrs: ${endQrs}`);
      return;
    }

    console.log(`[DOM] Mapping end_qrs ${endQrs} -> node_name: ${nodeName}`);

    // Parse node_name để lấy Line và Box number
    const match = nodeName.match(/L(\d+).*?(\d+)/);
    
    if (match) {
      const lineNumber = parseInt(match[1], 10); // L2 -> 2
      const boxNumber = parseInt(match[2], 10);  // CD-1a -> 1
      const lineIndex = lineNumber - 2;          // LINE 2 -> index 0
      
      // Xóa node_name cụ thể khỏi stack
      clearBox(lineIndex, boxNumber, nodeName);
      console.log(`[DOM] ✓ Removed "${nodeName}" from stack via end_qrs ${endQrs}`);
    } else {
      console.warn('[DOM] Could not parse node_name:', nodeName);
    }
  };

  /**
   * Clear tất cả boxes và stacks về trạng thái rỗng
   */
  const clearAllBoxes = () => {
    // Xóa tất cả stacks
    setBoxDataStacks({});
    
    // Xóa hiển thị DOM
    const allBoxes = document.querySelectorAll('.storage-box');
    allBoxes.forEach(box => {
      const textElement = box.querySelector('[data-content]');
      if (textElement) {
        textElement.innerHTML = '';
      }
      box.classList.remove('active');
    });
    console.log('[STACK] ✓ Cleared all stacks');
    console.log('[DOM] ✓ Cleared all boxes display');
  };

  /**
   * Parse node_name và push vào stack của box tương ứng
   * Logic: Push node_name vào stack, hiển thị phần tử ĐẦU TIÊN (FIFO)
   */
  const updateFromNodeName = (nodeName) => {
    if (!nodeName) return;
    
    console.log('[DOM] Parsing node_name:', nodeName);
    
    // Parse format: "L2_CD-2a/b" -> Line 2, Box 2
    const match = nodeName.match(/L(\d+).*?(\d+)/);
    
    if (match) {
      const lineNumber = parseInt(match[1], 10); // L2 -> 2
      const boxNumber = parseInt(match[2], 10); // 2a/b -> 2
      const lineIndex = lineNumber - 2; // LINE 2 -> index 0
      
      // Push vào stack của ô này
      updateBoxContent(lineIndex, boxNumber, nodeName, true);
      console.log(`[DOM] ✓ Pushed "${nodeName}" to stack of Line ${lineNumber}, Box ${boxNumber}`);
    } else {
      console.warn('[DOM] Could not parse node_name:', nodeName);
    }
  };

  /**
   * Cập nhật từ danh sách tasks
   * Logic: Push shelf_number của mỗi task vào stack của ô tương ứng
   */
  const updateFromTasks = (tasks) => {
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      console.log('[DOM] No tasks to update');
      return;
    }

    console.log(`[DOM] Processing ${tasks.length} tasks`);
    
    tasks.forEach((task, index) => {
      const { shelf_number, status } = task;
      
      if (shelf_number) {
        const match = shelf_number.match(/L(\d+).*?(\d+)/);
        
        if (match) {
          const lineNumber = parseInt(match[1], 10);
          const boxNumber = parseInt(match[2], 10);
          const lineIndex = lineNumber - 2;
          
          const isActive = status === 'processing' || status === 'active';
          
          // Push shelf_number vào stack
          updateBoxContent(lineIndex, boxNumber, shelf_number, isActive);
        }
      }
    });
    
    console.log(`[DOM] ✓ Pushed ${tasks.length} shelf_numbers to stacks`);
  };

  // ==================== WEBSOCKET CONNECTION ====================
  
  /**
   * Kết nối WebSocket và xử lý socket.onmessage trực tiếp
   */
  const connectWebSocket = () => {
    if (!initialGroupId) {
      setError('Group ID is required');
      return;
    }

    // Ngắt kết nối cũ nếu có
    if (socketRef.current) {
      socketRef.current.close();
    }

    const wsUrl = `${WS_BASE_URL}/ws/group/${initialGroupId}`;
    console.log(`[WebSocket] Connecting to: ${wsUrl}`);
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      // console.log('🔌 WEBSOCKET CONNECTED');
      // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      // console.log(`[WebSocket] Connected to group ${initialGroupId}`);
      // console.log('  - Timestamp:', new Date().toISOString());
      // console.log('');
      
      setIsConnected(true);
      setError(null);
    };

    //  XỬ LÝ socket.onmessage - Data sẽ được ghi trực tiếp vào DOM
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

    // console.log('╔═══════════════════════════════════════════════════════════════╗');
    // console.log('║           📨 NEW WEBSOCKET MESSAGE RECEIVED                   ║');
    // console.log('╚═══════════════════════════════════════════════════════════════╝');
    // console.log('⏰ Timestamp:', new Date().toISOString());
    //     console.log('📋 Message Type:', data.type || 'NO TYPE');
    //     console.log('📄 Full Data:', JSON.stringify(data, null, 2));
    //     console.log('');

        // Lấy group_id từ message
        if (data.group_id !== undefined) {
          console.log(' Setting group_id:', data.group_id);
          setCurrentGroupId(data.group_id);
        }

        // Xử lý theo TYPE
        if (data.type === 'Initial') {
      // console.log('┌─────────────────────────────────────────────────────────────┐');
      // console.log('│ 🔄 ACTION: INITIAL (Render Node to Grid)                   │');
      // console.log('└─────────────────────────────────────────────────────────────┘');
      //     console.log('  ├─ Group ID:', data.group_id);
      //     console.log('  ├─ Node Name:', data.node_name);
      //     console.log('  └─ Line:', data.line);
      // console.log('');
      
          if (data.node_name) {
            updateFromNodeName(data.node_name);
      } else {
            clearAllBoxes();
      }
          
        } else if (data.type === 'Clear') {
      // console.log('┌─────────────────────────────────────────────────────────────┐');
      // console.log('│ 🗑️  ACTION: CLEAR ORDER                                     │');
      // console.log('└─────────────────────────────────────────────────────────────┘');
      //     console.log('  ├─ Order ID:', data.order_id);
      //     console.log('  ├─ Group ID:', data.group_id);
      //     console.log('  └─ End QRS:', data.end_qrs);
      // console.log('');
          
          // Xử lý end_qrs: có thể là single value hoặc array
          if (data.end_qrs !== undefined) {
            const endQrsList = Array.isArray(data.end_qrs) ? data.end_qrs : [data.end_qrs];
            
            console.log(`[DOM] Processing ${endQrsList.length} end_qrs value(s) for clearing`);
            endQrsList.forEach(endQrs => {
              clearBoxByEndQrs(endQrs);
            });
          } else {
            console.warn('[DOM] No end_qrs provided in Clear message, clearing all boxes');
            clearAllBoxes();
          }
          
        } else if (data.type === 'TaskUpdate' && data.tasks) {
      // console.log('┌─────────────────────────────────────────────────────────────┐');
      // console.log('│ 📋 ACTION: UPDATE TASKS (TaskUpdate)                        │');
      // console.log('└─────────────────────────────────────────────────────────────┘');
      //     console.log('  ├─ Group ID:', data.group_id);
      //     console.log('  └─ Number of tasks:', data.tasks.length);
      // console.log('');
          updateFromTasks(data.tasks);
          
        } else if (Array.isArray(data)) {
      // console.log('┌─────────────────────────────────────────────────────────────┐');
      // console.log('│ 📋 ACTION: UPDATE TASKS (Array)                             │');
      // console.log('└─────────────────────────────────────────────────────────────┘');
      //     console.log('  └─ Number of tasks:', data.length);
      // console.log('');
          updateFromTasks(data);
          
        } else if (data.type === 'heartbeat') {
          // Heartbeat - bỏ qua
      return;
    } else {
          console.log('  WARNING: UNKNOWN DATA FORMAT');
        }
        
        console.log(' Message processing complete');
        console.log('');
        
      } catch (err) {
        console.error('[WebSocket] Error parsing message:', err);
        setError('Invalid data format');
      }
    };

    socket.onclose = (event) => {
      // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      // console.log('🔌 WEBSOCKET DISCONNECTED');
      // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      // console.log(`[WebSocket] Connection closed (Code: ${event.code})`);
      // console.log('');
      
      setIsConnected(false);
      socketRef.current = null;
      
      // Auto reconnect nếu không phải close bình thường
      if (event.code !== 1000) {
        setError('Connection lost. Reconnecting...');
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WebSocket] Attempting to reconnect...');
          connectWebSocket();
        }, 3000);
      }
    };

    socket.onerror = (error) => {
      console.error('[WebSocket] Connection error:', error);
      setError('Connection error - Server may not be running');
      setIsConnected(false);
    };

    socketRef.current = socket;
  };

  // Kết nối WebSocket khi component mount
  useEffect(() => {
    connectWebSocket();

    // Cleanup khi unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close(1000);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // ==================== TIME & DATE FUNCTIONS ====================

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

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
          background: black;
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
          position: relative;
          background-image: linear-gradient(
            90deg,
#008FBF,
#035575,
#002C3A
          );
        }

        .header-left {
          font-size: 2.1rem;
          font-weight: bold;
          display: flex;
          flex-direction: row;
          align-items: center;
          line-height: 1;
          flex: 1;
        }

        .group-badge {
          font-size: 0.9rem;
          font-weight: normal;
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 12px;
          border-radius: 15px;
          margin-top: 8px;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .logo-image {
          width: 350px;
          height: auto;
          object-fit: contain;
        }
        .post-text {
          font-size: 0.8rem;
          font-weight: normal;
          margin-left: 15px;
        }

        .header-center {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
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
          flex: 1;
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
          transition: transform 0.2s, box-shadow 0.2s, background 0.3s;
          max-height: 100%;
          background-image: linear-gradient(to bottom, var(--line-color), color-mix(in srgb, var(--line-color) 70%, black));
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow: 0 0 15px var(--line-color), inset 0 0 8px rgba(255, 255, 255, 0.5);
          aspect-ratio: auto;
        }
        .storage-box.active {
          animation: pulse 2s ease-in-out infinite;
          border: 2px solid #4FFFB0;
          box-shadow: 0 0 5px var(--line-color), 0 0 5px #4FFFB0, inset 0 0 5px rgba(79, 255, 176, 0.5);
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 5px var(--line-color), 0 0 5px #4FFFB0, inset 0 0 5px rgba(79, 255, 176, 0.5);
          }
          50% {
            box-shadow: 0 0 15px var(--line-color), 0 0 15px #4FFFB0, inset 0 0 5px rgba(79, 255, 176, 0.7);
          }
        }
        .ws-status {
          position: fixed;
          top: 10px;
          left: 10px;
          padding: 8px 15px;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: bold;
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .ws-status.connected {
          color: #4ade80;
        }

        .ws-status.disconnected {
          color: #f87171;
        }

        .ws-status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          animation: blink 1.5s ease-in-out infinite;
        }

        .ws-status.connected .ws-status-dot {
          background: #4ade80;
        }

        .ws-status.disconnected .ws-status-dot {
          background: #f87171;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
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
          font-size: 4.2vw; /* Kích thước chữ co dãn theo màn hình */
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
        // style={{
        //   backgroundImage: `url(${bgMonitorImage})`
        // }}
      >
        {/* WebSocket Connection Status */}
        {/* <div className={`ws-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="ws-status-dot"></span>
          {isConnected ? 'Connected' : error ? `Disconnected: ${error}` : 'Connecting...'}
        </div> */}

        <MonitorHeader date={currentDate} time={currentTime} groupId={currentGroupId} />
        <main className="main-content">
          {initialLineData.map((line, index) => (
            <StorageLine
              key={line.name}
              name={line.name}
              color={line.color}
              boxes={line.boxes}
              lineIndex={index}
            />
          ))}
        </main>
      </div>
    </>
  );
};

export default MonitorPackaged;


/* Ý tưởng để clear Monitor khi huỷ lệnh trên frontend:
 Cần 2 thao tác:
 1. Huỷ lệnh trên RCS 
*/
// import React, { useState, useEffect, useRef } from 'react';
// import bgMonitorImage from '../assets/bg8.jpg';

// // API configuration
// const API_HTTP_URL = import.meta.env.VITE_API_URL || 'http://192.168.50.16:6868';
// const WS_BASE_URL = API_HTTP_URL.replace(/^http/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws'));

// // 1. DỮ LIỆU (Data)
// // Cấu trúc ban đầu cho các lines
// const initialLineData = [
//   {
//     name: 'LINE 2',
//     color: '#008FBF', // Electric Blue (tối hơn)
//     boxes: [
//       { id: 1, text: '' },
//       { id: 2, text: '' },
//       { id: 3, text: '' },
//       { id: 4, text: '' },
//     ],
//   },
//   {
//     name: 'LINE 3',
//     color: '#772EBF', // Violet (tối hơn)
//     boxes: [
//       { id: 1, text: '' },
//       { id: 2, text: '' },
//       { id: 3, text: '' },
//       { id: 4, text: '' },
//     ],
//   },
//   {
//     name: 'LINE 4',
//     color: '#AC0090', // Fuchsia (tối hơn)
//     boxes: [
//       { id: 1, text: '' },
//       { id: 2, text: '' },
//       { id: 3, text: '' },
//       { id: 4, text: '' },
//     ],
//   },
// ];

// // Config cứng cho mapping end_qrs -> node_name
// const END_QRS_NODE_CONFIG = {
//   end_qrs: {
//     node_name: {
//       10000296: 'L2_CD-1a',
//       10000295: 'L2_CD-1b/c',
//       10000294: 'L2_CD-2a/b',
//       10000299: 'L2_CD-2c/d',
//       10001122: 'L2_CD-2e',
//       10001121: 'L2_CD-3a',
//       10000388: 'L2_CD-3b/c',
//       10000350: 'L3_CD-1a',
//       10000534: 'L3_CD-3c',
//       10000077: 'L4_CD-1b/c',
//       10000048: 'L4_CD-3b/c',
//       10000349: 'L3_CD-1b/c',
//       10000534: 'L3_CD-3c',
//       10000076: 'L4_CD-2a/b',
//       10000043: 'L4_CD-3d/e',
//       10000348: 'L3_CD-2a/b',
//       10000469: 'L3_CD-4a/b',
//       10000081: 'L4_CD-2c/d',
//       10000044: 'L4_CD-4a/b',
//       10000384: 'L2_CD-4a/b',
//       10000385: 'L2_CD-4c',
//       10000353: 'L3_CD-2c/d',
//       10000470: 'L3_CD-4c',
//       10001118: 'L4_CD-2e',
//       10000045: 'L4_CD-4c', 
//       10000383: 'L2_CD-3d/e',
//       10001120: 'L3_CD-2e',
//       10000078: 'L4_CD-1a',
//       10001117: 'L4_CD-3a'
//     },
//   },
// };

// // 2. CÁC COMPONENT CON (Child Components)

// // Component cho phần Header
// const MonitorHeader = ({ date, time, groupId }) => (
//   <header className="monitor-header">
//     <div className="header-left">
//       THADOSOFT
//       {groupId && (
//         <span className="group-badge">Group: {groupId}</span>
//       )}
//     </div>
//     <div className="header-center">
//       <div className="title-frame">
//         Monitor Storage System
//       </div>
//     </div>
//     <div className="header-right">
//       <div>{date}</div>
//       <div>{time}</div>
//     </div>
//   </header>
// );

// // Component cho một ô (box) - Dùng data-line và data-box để DOM manipulation
// const StorageBox = ({ lineIndex, boxId }) => (
//   <div 
//     className="storage-box" 
//     data-line={lineIndex} 
//     data-box={boxId}
//   >
//     <span className="box-id">{boxId}</span>
//     <span className="box-text" data-content></span>
//   </div>
// );

// // Component cho một hàng (line)
// const StorageLine = ({ name, color, boxes, lineIndex }) => (
//   <div className="storage-line" style={{ '--line-color': color }}>
//     <h2 className="line-name">{name}</h2>
//     <div className="box-container">
//       {boxes.map((box) => (
//         <StorageBox
//           key={box.id}
//           lineIndex={lineIndex}
//           boxId={box.id}
//         />
//       ))}
//     </div>
//   </div>
// );

// // 3. COMPONENT CHÍNH (Main Component)
// const MonitorPackaged = () => {
//   const [currentDate, setCurrentDate] = useState('');
//   const [currentTime, setCurrentTime] = useState('');
//   const [currentGroupId, setCurrentGroupId] = useState(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [error, setError] = useState(null);
  
//   // Stack/Array để lưu trữ nhiều giá trị cho mỗi ô grid
//   // Format: { "lineIndex-boxId": ["value1", "value2", ...] }
//   const [boxDataStacks, setBoxDataStacks] = useState({});
  
//   const socketRef = useRef(null);
//   const reconnectTimeoutRef = useRef(null);
  
//   // Lấy group_id từ URL params
//   const urlParams = new URLSearchParams(window.location.search);
//   const initialGroupId = urlParams.get('group_id') || '1';
  
//   console.log('╔═══════════════════════════════════════════════════════════════╗');
//   console.log('║           MonitorPackaged Component Started                  ║');
//   console.log('╚═══════════════════════════════════════════════════════════════╝');
//   console.log("[MonitorPackaged] 🔑 Initial connection group_id:", initialGroupId);
//   console.log('');
  
//   // ==================== DOM MANIPULATION FUNCTIONS ====================
  
//   /**
//    * Push data vào Stack của ô và render phần tử ĐẦU TIÊN (FIFO)
//    * Logic: Stack lưu nhiều giá trị, luôn hiển thị phần tử đầu tiên (index 0)
//    */
//   const updateBoxContent = (lineIndex, boxId, content, isActive = false) => {
//     const key = `${lineIndex}-${boxId}`;
    
//     // Push vào cuối Stack
//     setBoxDataStacks(prev => {
//       const currentStack = prev[key] || [];
//       const newStack = [...currentStack, content];
      
//       console.log(`[STACK] Push "${content}" to [L${lineIndex + 2}, Box${boxId}]`);
//       console.log(`[STACK] Stack now: [${newStack.join(', ')}]`);
      
//       // Render phần tử ĐẦU TIÊN trong stack (không phải phần tử vừa push)
//       const displayValue = newStack[0]; // Luôn lấy phần tử đầu
//       console.log(`[STACK] Display FIRST element: "${displayValue}"`);
      
//       // Update DOM
//       const boxElement = document.querySelector(
//         `.storage-box[data-line="${lineIndex}"][data-box="${boxId}"]`
//       );
      
//       if (boxElement) {
//         const textElement = boxElement.querySelector('[data-content]');
//         if (textElement) {
//           textElement.innerHTML = displayValue || '';
//         }
        
//         // Toggle active class
//         if (isActive) {
//           boxElement.classList.add('active');
//         } else {
//           boxElement.classList.remove('active');
//         }
        
//         console.log(`[DOM] ✓ Display: "${displayValue}" at Line ${lineIndex + 2}, Box ${boxId}`);
//       } else {
//         console.warn(`[DOM] ✗ Box not found: Line ${lineIndex}, Box ${boxId}`);
//       }
      
//       return {
//         ...prev,
//         [key]: newStack
//       };
//     });
//   };

//   /**
//    * Xóa một giá trị cụ thể khỏi Stack và render lại phần tử ĐẦU TIÊN (FIFO)
//    * Nếu valueToRemove không được cung cấp -> xóa toàn bộ stack
//    */
//   const clearBox = (lineIndex, boxId, valueToRemove = null) => {
//     const key = `${lineIndex}-${boxId}`;
    
//     setBoxDataStacks(prev => {
//       const currentStack = prev[key] || [];
      
//       let newStack;
      
//       if (valueToRemove === null) {
//         // Không có giá trị cụ thể -> Xóa toàn bộ stack
//         newStack = [];
//         console.log(`[STACK] Clear ALL from [L${lineIndex + 2}, Box${boxId}]`);
//       } else {
//         // Xóa giá trị cụ thể khỏi stack
//         newStack = currentStack.filter(item => item !== valueToRemove);
//         console.log(`[STACK] Remove "${valueToRemove}" from [L${lineIndex + 2}, Box${boxId}]`);
//         console.log(`[STACK] Stack was: [${currentStack.join(', ')}]`);
//         console.log(`[STACK] Stack now: [${newStack.join(', ')}]`);
//       }
      
//       // Render lại phần tử ĐẦU TIÊN (hoặc rỗng nếu stack trống)
//       const boxElement = document.querySelector(
//         `.storage-box[data-line="${lineIndex}"][data-box="${boxId}"]`
//       );
      
//       if (boxElement) {
//         const textElement = boxElement.querySelector('[data-content]');
//         if (textElement) {
//           // Lấy phần tử ĐẦU TIÊN thay vì cuối
//           const firstValue = newStack.length > 0 ? newStack[0] : '';
//           textElement.innerHTML = firstValue;
//           console.log(`[DOM] ✓ Re-render FIRST element: "${firstValue}" at Line ${lineIndex + 2}, Box ${boxId}`);
//         }
        
//         // Xóa active class nếu stack rỗng
//         if (newStack.length === 0) {
//           boxElement.classList.remove('active');
//         }
//       }
      
//       return {
//         ...prev,
//         [key]: newStack
//       };
//     });
//   };

//   /**
//    * Clear box dựa trên end_qrs
//    * Map end_qrs -> node_name -> parse để lấy lineIndex và boxId
//    * Xóa node_name cụ thể khỏi stack của ô đó
//    */
//   const clearBoxByEndQrs = (endQrs) => {
//     if (!endQrs && endQrs !== 0) {
//       console.warn('[DOM] Invalid end_qrs:', endQrs);
//       return;
//     }

//     // Lấy node_name từ config
//     const nodeName = END_QRS_NODE_CONFIG.end_qrs.node_name[endQrs];
    
//     if (!nodeName) {
//       console.warn(`[DOM] No node_name mapping found for end_qrs: ${endQrs}`);
//       return;
//     }

//     console.log(`[DOM] Mapping end_qrs ${endQrs} -> node_name: ${nodeName}`);

//     // Parse node_name để lấy Line và Box number
//     const match = nodeName.match(/L(\d+).*?(\d+)/);
    
//     if (match) {
//       const lineNumber = parseInt(match[1], 10); // L2 -> 2
//       const boxNumber = parseInt(match[2], 10);  // CD-1a -> 1
//       const lineIndex = lineNumber - 2;          // LINE 2 -> index 0
      
//       // Xóa node_name cụ thể khỏi stack
//       clearBox(lineIndex, boxNumber, nodeName);
//       console.log(`[DOM] ✓ Removed "${nodeName}" from stack via end_qrs ${endQrs}`);
//     } else {
//       console.warn('[DOM] Could not parse node_name:', nodeName);
//     }
//   };

//   /**
//    * Clear tất cả boxes và stacks về trạng thái rỗng
//    */
//   const clearAllBoxes = () => {
//     // Xóa tất cả stacks
//     setBoxDataStacks({});
    
//     // Xóa hiển thị DOM
//     const allBoxes = document.querySelectorAll('.storage-box');
//     allBoxes.forEach(box => {
//       const textElement = box.querySelector('[data-content]');
//       if (textElement) {
//         textElement.innerHTML = '';
//       }
//       box.classList.remove('active');
//     });
//     console.log('[STACK] ✓ Cleared all stacks');
//     console.log('[DOM] ✓ Cleared all boxes display');
//   };

//   /**
//    * Parse node_name và push vào stack của box tương ứng
//    * Logic: Push node_name vào stack, hiển thị phần tử ĐẦU TIÊN (FIFO)
//    */
//   const updateFromNodeName = (nodeName) => {
//     if (!nodeName) return;
    
//     console.log('[DOM] Parsing node_name:', nodeName);
    
//     // Parse format: "L2_CD-2a/b" -> Line 2, Box 2
//     const match = nodeName.match(/L(\d+).*?(\d+)/);
    
//     if (match) {
//       const lineNumber = parseInt(match[1], 10); // L2 -> 2
//       const boxNumber = parseInt(match[2], 10); // 2a/b -> 2
//       const lineIndex = lineNumber - 2; // LINE 2 -> index 0
      
//       // Push vào stack của ô này
//       updateBoxContent(lineIndex, boxNumber, nodeName, true);
//       console.log(`[DOM] ✓ Pushed "${nodeName}" to stack of Line ${lineNumber}, Box ${boxNumber}`);
//     } else {
//       console.warn('[DOM] Could not parse node_name:', nodeName);
//     }
//   };

//   /**
//    * Cập nhật từ danh sách tasks
//    * Logic: Push shelf_number của mỗi task vào stack của ô tương ứng
//    */
//   const updateFromTasks = (tasks) => {
//     if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
//       console.log('[DOM] No tasks to update');
//       return;
//     }

//     console.log(`[DOM] Processing ${tasks.length} tasks`);
    
//     tasks.forEach((task, index) => {
//       const { shelf_number, status } = task;
      
//       if (shelf_number) {
//         const match = shelf_number.match(/L(\d+).*?(\d+)/);
        
//         if (match) {
//           const lineNumber = parseInt(match[1], 10);
//           const boxNumber = parseInt(match[2], 10);
//           const lineIndex = lineNumber - 2;
          
//           const isActive = status === 'processing' || status === 'active';
          
//           // Push shelf_number vào stack
//           updateBoxContent(lineIndex, boxNumber, shelf_number, isActive);
//         }
//       }
//     });
    
//     console.log(`[DOM] ✓ Pushed ${tasks.length} shelf_numbers to stacks`);
//   };

//   // ==================== WEBSOCKET CONNECTION ====================
  
//   /**
//    * Kết nối WebSocket và xử lý socket.onmessage trực tiếp
//    */
//   const connectWebSocket = () => {
//     if (!initialGroupId) {
//       setError('Group ID is required');
//       return;
//     }

//     // Ngắt kết nối cũ nếu có
//     if (socketRef.current) {
//       socketRef.current.close();
//     }

//     const wsUrl = `${WS_BASE_URL}/ws/group/${initialGroupId}`;
//     console.log(`[WebSocket] Connecting to: ${wsUrl}`);
    
//     const socket = new WebSocket(wsUrl);

//     socket.onopen = () => {
//       console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
//       console.log('🔌 WEBSOCKET CONNECTED');
//       console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
//       console.log(`[WebSocket] Connected to group ${initialGroupId}`);
//       console.log('  - Timestamp:', new Date().toISOString());
//       console.log('');
      
//       setIsConnected(true);
//       setError(null);
//     };

//     // ⚡ XỬ LÝ socket.onmessage - Data sẽ được ghi trực tiếp vào DOM
//     socket.onmessage = (event) => {
//       try {
//         const data = JSON.parse(event.data);

//     console.log('╔═══════════════════════════════════════════════════════════════╗');
//     console.log('║           📨 NEW WEBSOCKET MESSAGE RECEIVED                   ║');
//     console.log('╚═══════════════════════════════════════════════════════════════╝');
//     console.log('⏰ Timestamp:', new Date().toISOString());
//         console.log('📋 Message Type:', data.type || 'NO TYPE');
//         console.log('📄 Full Data:', JSON.stringify(data, null, 2));
//         console.log('');

//         // Lấy group_id từ message
//         if (data.group_id !== undefined) {
//           console.log('🎯 Setting group_id:', data.group_id);
//           setCurrentGroupId(data.group_id);
//         }

//         // Xử lý theo TYPE
//         if (data.type === 'Initial') {
//       console.log('┌─────────────────────────────────────────────────────────────┐');
//       console.log('│ 🔄 ACTION: INITIAL (Render Node to Grid)                   │');
//       console.log('└─────────────────────────────────────────────────────────────┘');
//           console.log('  ├─ Group ID:', data.group_id);
//           console.log('  ├─ Node Name:', data.node_name);
//           console.log('  └─ Line:', data.line);
//       console.log('');
      
//           if (data.node_name) {
//             updateFromNodeName(data.node_name);
//       } else {
//             clearAllBoxes();
//       }
          
//         } else if (data.type === 'Clear') {
//       console.log('┌─────────────────────────────────────────────────────────────┐');
//       console.log('│ 🗑️  ACTION: CLEAR ORDER                                     │');
//       console.log('└─────────────────────────────────────────────────────────────┘');
//           console.log('  ├─ Order ID:', data.order_id);
//           console.log('  ├─ Group ID:', data.group_id);
//           console.log('  └─ End QRS:', data.end_qrs);
//       console.log('');
          
//           // Xử lý end_qrs: có thể là single value hoặc array
//           if (data.end_qrs !== undefined) {
//             const endQrsList = Array.isArray(data.end_qrs) ? data.end_qrs : [data.end_qrs];
            
//             console.log(`[DOM] Processing ${endQrsList.length} end_qrs value(s) for clearing`);
//             endQrsList.forEach(endQrs => {
//               clearBoxByEndQrs(endQrs);
//             });
//           } else {
//             console.warn('[DOM] No end_qrs provided in Clear message, clearing all boxes');
//             clearAllBoxes();
//           }
          
//         } else if (data.type === 'TaskUpdate' && data.tasks) {
//       console.log('┌─────────────────────────────────────────────────────────────┐');
//       console.log('│ 📋 ACTION: UPDATE TASKS (TaskUpdate)                        │');
//       console.log('└─────────────────────────────────────────────────────────────┘');
//           console.log('  ├─ Group ID:', data.group_id);
//           console.log('  └─ Number of tasks:', data.tasks.length);
//       console.log('');
//           updateFromTasks(data.tasks);
          
//         } else if (Array.isArray(data)) {
//       console.log('┌─────────────────────────────────────────────────────────────┐');
//       console.log('│ 📋 ACTION: UPDATE TASKS (Array)                             │');
//       console.log('└─────────────────────────────────────────────────────────────┘');
//           console.log('  └─ Number of tasks:', data.length);
//       console.log('');
//           updateFromTasks(data);
          
//         } else if (data.type === 'heartbeat') {
//           // Heartbeat - bỏ qua
//       return;
//     } else {
//           console.log('⚠️  WARNING: UNKNOWN DATA FORMAT');
//         }
        
//         console.log('✅ Message processing complete');
//         console.log('');
        
//       } catch (err) {
//         console.error('[WebSocket] Error parsing message:', err);
//         setError('Invalid data format');
//       }
//     };

//     socket.onclose = (event) => {
//       console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
//       console.log('🔌 WEBSOCKET DISCONNECTED');
//       console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
//       console.log(`[WebSocket] Connection closed (Code: ${event.code})`);
//       console.log('');
      
//       setIsConnected(false);
//       socketRef.current = null;
      
//       // Auto reconnect nếu không phải close bình thường
//       if (event.code !== 1000) {
//         setError('Connection lost. Reconnecting...');
//         reconnectTimeoutRef.current = setTimeout(() => {
//           console.log('[WebSocket] Attempting to reconnect...');
//           connectWebSocket();
//         }, 3000);
//       }
//     };

//     socket.onerror = (error) => {
//       console.error('[WebSocket] Connection error:', error);
//       setError('Connection error - Server may not be running');
//       setIsConnected(false);
//     };

//     socketRef.current = socket;
//   };

//   // Kết nối WebSocket khi component mount
//   useEffect(() => {
//     connectWebSocket();

//     // Cleanup khi unmount
//     return () => {
//       if (socketRef.current) {
//         socketRef.current.close(1000);
//       }
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//       }
//     };
//   }, []);

//   // ==================== TIME & DATE FUNCTIONS ====================

//   const formatDate = (date) => {
//     const day = String(date.getDate()).padStart(2, '0');
//     const month = String(date.getMonth() + 1).padStart(2, '0');
//     const year = date.getFullYear();
//     return `${day}/${month}/${year}`;
//   };

//   const formatTime = (date) => {
//     const hours = String(date.getHours()).padStart(2, '0');
//     const minutes = String(date.getMinutes()).padStart(2, '0');
//     const seconds = String(date.getSeconds()).padStart(2, '0');
//     return `${hours}:${minutes}:${seconds}`;
//   };


//   // Cập nhật thời gian mỗi giây
//   useEffect(() => {
//     const updateDateTime = () => {
//       const now = new Date();
//       setCurrentDate(formatDate(now));
//       setCurrentTime(formatTime(now));
//     };

//     // Cập nhật ngay lập tức
//     updateDateTime();

//     // Cập nhật mỗi giây
//     const interval = setInterval(updateDateTime, 1000);

//     // Cleanup interval khi component unmount
//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <>
//       {/* Nhúng CSS trực tiếp vào file JSX cho tiện lợi */}
//       <style>{`
//         /* --- Global Styles --- */
//         body {
//           margin: 0;
//           padding: 0;
//           font-family: 'Segoe UI', 'Arial', sans-serif;
//           background-color: #0a0a1a; /* Màu nền tối mô phỏng */
//           color: #ffffff;
//         }

//         .monitor-container {
//           width: 100%;
//           height: 100vh;
//           padding: 10px;
//           box-sizing: border-box;
//           overflow: hidden;
//           display: flex;
//           flex-direction: column;
//           background-size: cover;
//           background-position: center;
//           background-repeat: no-repeat;
//           background-attachment: fixed;
//         }

//         /* --- Header Styles --- */
//         .monitor-header {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           padding: 15px;
//           color: white;
//           margin-bottom: 10px;
//           flex-shrink: 0;
//           border-radius: 15px;
//           background-image: linear-gradient(
//             90deg,
//             #008FBF,
//             #772EBF,
//             #AC0090
//           );
//         }

//         .header-left {
//           font-size: 2.1rem;
//           font-weight: bold;
//           display: flex;
//           flex-direction: column;
//           align-items: flex-start;
//           line-height: 1;
//         }

//         .group-badge {
//           font-size: 0.9rem;
//           font-weight: normal;
//           background: rgba(255, 255, 255, 0.2);
//           padding: 4px 12px;
//           border-radius: 15px;
//           margin-top: 8px;
//           border: 1px solid rgba(255, 255, 255, 0.3);
//         }

//         .post-text {
//           font-size: 0.8rem;
//           font-weight: normal;
//           margin-left: 15px;
//         }

//         .header-center {
//           flex-grow: 1;
//           text-align: center;
//         }

//         .title-frame {
//           display: inline-block;
//           padding: 10px 30px;
//           font-size: 2.4rem;
//           font-weight: bold;
//         }

//         .header-right {
//           text-align: right;
//           font-size: 1.9rem;
//           font-family: 'Courier New', 'Monaco', 'Consolas', monospace;
//           font-weight: bold;
//           letter-spacing: 1px;
//         }

//         /* --- Content Styles --- */
//         .main-content {
//           display: flex;
//           flex-direction: column;
//           gap: 10px;
//           flex: 1;
//           overflow: hidden;
//         }

//         .storage-line {
//           width: 100%;
//           flex: 1;
//           display: flex;
//           flex-direction: column;
//           min-height: 0;
//         }

//         .line-name {
//           font-size: 1.2rem;
//           font-weight: bold;
//           color: #eee;
//           margin-bottom: 5px;
//           margin-left: 10px;
//           margin-top: 0;
//           flex-shrink: 0;
//           text-transform: uppercase;
//         }

//         .box-container {
//           display: grid;
//           grid-template-columns: repeat(4, 1fr); /* Tạo lưới 4 cột */
//           gap: 8px;
//           flex: 1;
//           min-height: 0;
//         }

//         .storage-box {
//           border-radius: 8px;
//           padding: 8px;
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           justify-content: center;
//           position: relative;
//           transition: transform 0.2s, box-shadow 0.2s, background 0.3s;
//           max-height: 100%;
//           background-image: linear-gradient(to bottom, var(--line-color), color-mix(in srgb, var(--line-color) 70%, black));
//           border: 1px solid rgba(255, 255, 255, 0.7);
//           box-shadow: 0 0 15px var(--line-color), inset 0 0 8px rgba(255, 255, 255, 0.5);
//           aspect-ratio: auto;
//         }
        
//         .storage-box:hover {
//             transform: translateY(-5px) scale(1.02);
//             box-shadow: 0 8px 25px var(--line-color), inset 0 0 12px rgba(255, 255, 255, 0.7);
//         }

//         .storage-box.active {
//           animation: pulse 2s ease-in-out infinite;
//           border: 2px solid #FFD700;
//           box-shadow: 0 0 25px var(--line-color), 0 0 15px #FFD700, inset 0 0 12px rgba(255, 215, 0, 0.7);
//         }

//         @keyframes pulse {
//           0%, 100% {
//             box-shadow: 0 0 25px var(--line-color), 0 0 15px #FFD700, inset 0 0 12px rgba(255, 215, 0, 0.7);
//           }
//           50% {
//             box-shadow: 0 0 35px var(--line-color), 0 0 25px #FFD700, inset 0 0 20px rgba(255, 215, 0, 0.9);
//           }
//         }

//         .ws-status {
//           position: fixed;
//           top: 10px;
//           left: 10px;
//           padding: 8px 15px;
//           border-radius: 20px;
//           font-size: 0.9rem;
//           font-weight: bold;
//           z-index: 1000;
//           display: flex;
//           align-items: center;
//           gap: 8px;
//           background: rgba(0, 0, 0, 0.7);
//           border: 1px solid rgba(255, 255, 255, 0.3);
//         }

//         .ws-status.connected {
//           color: #4ade80;
//         }

//         .ws-status.disconnected {
//           color: #f87171;
//         }

//         .ws-status-dot {
//           width: 10px;
//           height: 10px;
//           border-radius: 50%;
//           animation: blink 1.5s ease-in-out infinite;
//         }

//         .ws-status.connected .ws-status-dot {
//           background: #4ade80;
//         }

//         .ws-status.disconnected .ws-status-dot {
//           background: #f87171;
//         }

//         @keyframes blink {
//           0%, 100% { opacity: 1; }
//           50% { opacity: 0.4; }
//         }

//         .box-id {
//           position: absolute;
//           top: 5px;
//           font-size: 1.8rem;
//           color: rgba(255, 255, 255, 0.9);
//           font-weight: bold;
//         }

//         .box-text {
//           font-size: 4vw; /* Kích thước chữ co dãn theo màn hình */
//           font-weight: bold;
//           color: #FFFFFF; /* Chữ màu trắng */
//           text-align: center;
//         }

//         /* Responsive cho thiết bị di động */
//         @media (max-width: 768px) {
//           .box-container {
//             grid-template-columns: 1fr; /* 1 cột trên di động */
//           }

//           .box-text {
//             font-size: 6vw; /* Chữ to hơn trên di động */
//           }

//           .monitor-header {
//             flex-direction: column;
//             gap: 15px;
//           }

//           .title-frame {
//             font-size: 1.2rem;
//             padding: 8px 20px;
//           }
//         }
//       `}</style>

//       {/* Phần render chính */}
//       <div 
//         className="monitor-container"
//         style={{
//           backgroundImage: `url(${bgMonitorImage})`
//         }}
//       >
//         {/* WebSocket Connection Status */}
//         <div className={`ws-status ${isConnected ? 'connected' : 'disconnected'}`}>
//           <span className="ws-status-dot"></span>
//           {isConnected ? 'Connected' : error ? `Disconnected: ${error}` : 'Connecting...'}
//         </div>

//         <MonitorHeader date={currentDate} time={currentTime} groupId={currentGroupId} />
//         <main className="main-content">
//           {initialLineData.map((line, index) => (
//             <StorageLine
//               key={line.name}
//               name={line.name}
//               color={line.color}
//               boxes={line.boxes}
//               lineIndex={index}
//             />
//           ))}
//         </main>
//       </div>
//     </>
//   );
// };

// export default MonitorPackaged;