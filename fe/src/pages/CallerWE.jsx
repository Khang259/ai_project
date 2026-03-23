import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/GridManagement/useAuth';
import { sendCallerWE } from '@/services/callerWE';

// Dữ liệu mock - nhóm theo khu vực
const mockNodes = {
  'PA': [
    { id: '40000942', name: 'Xe Frame cấp PA PA.1' },
    { id: '40000939', name: 'Xe Frame Cấp PA PA.2' },
    { id: '40000937', name: 'Xe Frame Cấp PA PA.3' },
    { id: '40000801', name: 'Xe Trống PA.4' },
    { id: '40000802', name: 'Xe Trống PA.5' },
    { id: '40000940', name: 'Xe Trống PA.6' },
    { id: '40000934', name: 'Xe Cấp Tank PA.7' },
    { id: '40000932', name: 'Xe Cấp Tank PA.8' },
    { id: '40000930', name: 'Xe Cấp Tank PA.9' },
    { id: '40000928', name: 'Xe Frame cấp PA PA.10' },
  ],
  'Frame 5': [
    { id: '40000881', name: 'Xe Frame cấp PA 5.1' },
    { id: '40000882', name: 'Xe Frame cấp PA 5.2' },
    { id: '40000883', name: 'Xe cấp kho A 5.3' },
    { id: '40000884', name: 'Xe Trống 5.4' },
    { id: '40000885', name: 'Xe cấp kho B 5.5' },
  ],
  'Frame 4': [
    { id: '40000886', name: 'Xe cấp kho B 4.1' },
    { id: '40000887', name: 'Xe cấp kho A 4.2' },
    { id: '40000888', name: 'Xe Frame cấp PA 4.3' },
    { id: '40000889', name: 'Xe Frame cấp PA 4.4' },
    { id: '40000890', name: 'Xe Trống 4.5' },
  ],
  'Kho A': [
    { id: '40000891', name: 'Xe nhận kho B A.1' },
    { id: '40000892', name: 'Xe Frame cấp PA A.2' },
    { id: '10001537', name: 'Xe nhận DC A.3' },
    { id: '10001533', name: 'Xe Frame cấp PA A.4' },
    { id: '40000900', name: 'Xe Trống A.5' },
    { id: '40000899', name: 'Xe Cấp Tank A.6' },
    { id: '40000895', name: 'Xe Cấp Tank A.7' },
  ],
  'Frame 6': [
    { id: '40000897', name: 'Xe Trống 6.1' },
    { id: '40000893', name: 'Xe Frame cấp PA 6.2' },
    { id: '40001084', name: 'Xe Frame cấp PA 6.3' },
    { id: '40000898', name: 'Xe cấp kho A 6.4' },
    { id: '40000894', name: 'Xe cấp kho B 6.5' },
  ],
  'Frame 7': [
    { id: '40000901', name: 'Xe Frame cấp PA 7.1' },
    { id: '40000902', name: 'Xe Frame cấp PA 7.2' },
    { id: '40000903', name: 'Xe cấp kho A 7.3' },
    { id: '40000904', name: 'Xe cấp kho B 7.4' },
    { id: '40000905', name: 'Xe Trống 7.5' },
  ],
  'Kho B': [
    { id: '40001062', name: 'Xe Cấp Tank D.1' },
    { id: '40001063', name: 'Xe Cấp Tank D.2' },
    { id: '40001064', name: 'Xe Cấp Tank D.3' },
    { id: '40001065', name: 'Xe Cấp Tank D.4' },
    { id: '40001066', name: 'Xe Cấp Tank D.5' },
    { id: '40001067', name: 'Xe Cấp Tank D.6' },
    { id: '40000804', name: 'Xe Frame cấp PA C.1' },
    { id: '40000803', name: 'Xe nhận DC C.2' },
    { id: '40001104', name: 'Xe Frame cấp PA B.1' },
    { id: '40001105', name: 'Xe cấp kho A B.2' },
    { id: '40001106', name: 'Xe nhận DC B.3' },
    { id: '40001107', name: 'Xe nhận DC B.4' },
    { id: '40001108', name: 'Xe Frame cấp PA B.5' },
    { id: '40001109', name: 'Xe cấp kho A B.6' },
    { id: '40001110', name: 'Xe cấp kho A B.7' },
    { id: '40001111', name: 'Xe Trống B.8' },
    { id: '40001112', name: 'Xe Trống B.9' },
    { id: '40000806', name: 'Xe Frame cấp PA B.10' },
    { id: '40000805', name: 'Xe nhận DC B.11' },
  ],
};

// Màu sắc cho từng khu vực
const areaColors = {
  'PA': 'bg-purple-500',
  'Frame 4': 'bg-blue-500',
  'Frame 5': 'bg-cyan-500',
  'Frame 6': 'bg-green-500',
  'Frame 7': 'bg-yellow-500',
  'Kho A': 'bg-orange-500',
  'Kho B': 'bg-red-500',
};

export default function CallerWE() {
  const { currentUser, logout } = useAuth();
  const [pickupPoint, setPickupPoint] = useState(null);
  const [dropoffPoint, setDropoffPoint] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null); // 'pickup' | 'dropoff' | null
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [commandLogs, setCommandLogs] = useState([]);
  
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);
  const dropdownRef = useRef(null);

  // Xử lý click outside để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        pickupRef.current &&
        !pickupRef.current.contains(event.target) &&
        dropoffRef.current &&
        !dropoffRef.current.contains(event.target)
      ) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const handleSelectPoint = (type, node) => {
    if (type === 'pickup') {
      setPickupPoint(node);
    } else {
      setDropoffPoint(node);
    }
    setOpenDropdown(null);
  };

  const handleSubmit = () => {
    if (!pickupPoint || !dropoffPoint) {
      alert('Vui lòng chọn đầy đủ điểm lấy hàng và điểm trả hàng');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (!pickupPoint || !dropoffPoint) return;

    setIsSubmitting(true);
    
    try {
      // Lấy thông tin user từ auth
      const owner = currentUser?.username || 'default_user';
      
      // Tạo payload theo schema ProcessCaller
      const payload = {
        node_name: pickupPoint.name, // Sử dụng name của điểm pickup
        node_type:'welding', // Loại node cho xưởng hàn
        owner: owner,
        process_code: '',
        start: parseInt(pickupPoint.id), // Sử dụng id làm start
        end: parseInt(dropoffPoint.id), // Sử dụng id làm end
        next_start: null,
        next_end: null,
        line: 'WE', // Line cho xưởng hàn
      };

      const result = await sendCallerWE(payload);
      
      const logEntry = {
        id: Date.now(),
        pickupName: pickupPoint.name,
        dropoffName: dropoffPoint.name,
        status: result.success ? 'Thành công' : 'Lỗi'
      };
      setCommandLogs((prev) => [logEntry, ...prev]);

      if (result.success) {
        alert(`✅ Gửi lệnh thành công!\nĐiểm lấy: ${pickupPoint.name}\nĐiểm trả: ${dropoffPoint.name}`);
        setShowConfirmModal(false);
        setPickupPoint(null);
        setDropoffPoint(null);
      } else {
        alert(`❌ Gửi lệnh thất bại: ${result.error || 'Lỗi không xác định'}`);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Có lỗi xảy ra khi gửi lệnh');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSend = () => {
    setShowConfirmModal(false);
  };

  const renderDropdown = () => {
    if (!openDropdown) return null;

    return (
      <div
        ref={dropdownRef}
        className="absolute top-full left-0 mt-2 w-full max-h-[500px] overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200 z-50"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
          {Object.entries(mockNodes).map(([areaName, nodes]) => (
            <div key={areaName} className="space-y-2">
              {/* Header khu vực */}
              <div className={`${areaColors[areaName]} text-white px-3 py-1 rounded font-semibold text-xs sm:text-sm`}>
                {areaName}
              </div>
              
              {/* Grid responsive: 2 cột mobile, 4 cột desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {nodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => handleSelectPoint(openDropdown, node)}
                    className="px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-100 hover:border-[#016B61] transition-colors text-left"
                  >
                    {node.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-4 sm:mb-6">
          {/* Header giống MobileGridDisplay */}
          <div className="bg-[#016B61] px-3 py-3 sm:px-6 sm:py-4 text-white">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
              <h1 className="text-lg sm:text-xl font-bold text-center sm:text-left">CALLER WE</h1>
              <button 
                className="bg-white/20 hover:bg-white/30 border border-white/30 text-white px-3 py-2 sm:px-4 rounded font-medium transition-colors duration-200 text-sm sm:text-base"
                onClick={logout}
              >
                Đăng xuất
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-2">
              <div className="text-center sm:text-left">
                <span className="bg-white/20 border border-white/30 px-2 py-1 sm:px-3 rounded text-xs sm:text-sm font-medium">
                  User: {currentUser?.username || 'Chưa đăng nhập'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-3 sm:p-4">
            {/* Hai ô chọn điểm */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              {/* Điểm lấy hàng */}
              <div className="flex-1 relative" ref={pickupRef}>
                <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Điểm lấy hàng</label>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'pickup' ? null : 'pickup')}
                  className="w-full px-4 py-3 bg-white rounded-lg border-2 border-gray-300 hover:border-[#016B61] focus:outline-none focus:border-[#016B61] text-left flex justify-between items-center transition-colors"
                >
                  <span className={pickupPoint ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                    {pickupPoint ? pickupPoint.name : 'Chọn điểm lấy hàng'}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${openDropdown === 'pickup' ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'pickup' && renderDropdown()}
              </div>

              {/* Điểm trả hàng */}
              <div className="flex-1 relative" ref={dropoffRef}>
                <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Điểm trả hàng</label>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'dropoff' ? null : 'dropoff')}
                  className="w-full px-4 py-3 bg-white rounded-lg border-2 border-gray-300 hover:border-[#016B61] focus:outline-none focus:border-[#016B61] text-left flex justify-between items-center transition-colors"
                >
                  <span className={dropoffPoint ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                    {dropoffPoint ? dropoffPoint.name : 'Chọn điểm trả hàng'}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${openDropdown === 'dropoff' ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'dropoff' && renderDropdown()}
              </div>
            </div>

            {/* Nút xác nhận */}
            <div className="flex justify-center mb-4">
              <button
                onClick={handleSubmit}
                disabled={!pickupPoint || !dropoffPoint || isSubmitting}
                className={`px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold text-white transition-all text-sm sm:text-base ${
                  pickupPoint && dropoffPoint && !isSubmitting
                    ? 'bg-[#016B61] hover:bg-[#014d47] cursor-pointer'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Đang gửi...' : 'Xác nhận gửi lệnh'}
              </button>
            </div>
          </div>
        </div>

        {/* Modal xác nhận */}
        {showConfirmModal && pickupPoint && dropoffPoint && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#016B61]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✅</span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-800 mb-2">Xác nhận gửi lệnh</h3>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Điểm lấy hàng:</span>
                      <span className="font-bold text-gray-800">{pickupPoint.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Điểm trả hàng:</span>
                      <span className="font-bold text-gray-800">{dropoffPoint.name}</span>
                    </div>
                    <div className="flex justify-center pt-2">
                      <span className="font-bold text-[#016B61] text-lg">
                        {pickupPoint.id} → {dropoffPoint.id}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded font-medium transition-colors duration-200"
                    onClick={handleCancelSend}
                  >
                    Hủy
                  </button>
                  <button
                    className="flex-1 bg-[#016B61] hover:bg-[#014d47] text-white py-2 px-4 rounded font-medium transition-colors duration-200"
                    onClick={handleConfirmSend}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang gửi...' : 'Xác nhận'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lịch sử gửi lệnh */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Lịch sử gửi lệnh</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Điểm lấy hàng</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Điểm trả hàng</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tình trạng</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commandLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">
                      Chưa có lệnh nào được gửi
                    </td>
                  </tr>
                ) : (
                  commandLogs.map((log, idx) => (
                    <tr key={log.id}>
                      <td className="px-4 py-2 text-sm text-gray-700">{idx + 1}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{log.pickupName}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{log.dropoffName}</td>
                      <td className="px-4 py-2 text-sm font-semibold">
                        {log.status === 'Thành công' ? (
                          <span className="text-green-600">Thành công</span>
                        ) : (
                          <span className="text-red-600">Lỗi</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

