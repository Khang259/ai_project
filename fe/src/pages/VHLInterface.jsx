import { useState, useEffect } from 'react'
import { LINES, getNodes } from '../data/vhlMockData'
import { getCarriages, requestVHL, updateSlotState } from '../services/vhlApi'
import './VHLInterface.css'

function VHLInterface() {
  const [carriages, setCarriages] = useState([])
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  // Form state
  const [vhlType, setVhlType] = useState('import')
  const [line, setLine] = useState(1)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [nextStart, setNextStart] = useState(0)
  const [nextEnd, setNextEnd] = useState(0)

  const [confirmToast, setConfirmToast] = useState(null)

  useEffect(() => {
    Promise.all([getCarriages(), getNodes()])
      .then(([c, n]) => {
        setCarriages(c)
        setNodes(n)
        if (n.length > 0) {
          const firstNode = n[0]
          setVhlType(firstNode.type)
          setLine(firstNode.line)
          setStart(firstNode.start)
          setEnd(firstNode.end)
          setNextStart(firstNode.next_start)
          setNextEnd(firstNode.next_end)
        }
        setLoading(false)
      })
      .catch(() => {
        showMsg('err', 'Lỗi kết nối API. Đang dùng mock data.')
        getNodes().then((n) => {
          setNodes(n)
          if (n.length > 0) {
            const firstNode = n[0]
            setVhlType(firstNode.type)
            setLine(firstNode.line)
            setStart(firstNode.start)
            setEnd(firstNode.end)
            setNextStart(firstNode.next_start)
            setNextEnd(firstNode.next_end)
          }
        })
        setLoading(false)
      })
  }, [])

  const showMsg = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const askConfirmation = (text, onConfirm) => {
    setConfirmToast({ text, onConfirm })
  }

  const handleRequestVHL = async () => {
    setMessage(null)
    const payload = { type: vhlType, line }
    if (vhlType === 'import') payload.start = start
    else if (vhlType === 'supply') payload.end = end
    else if (vhlType === 'return') {
      payload.next_start = nextStart
      payload.next_end = nextEnd
    } else if (vhlType === 'dual') {
      payload.end = end
      payload.next_start = nextStart
      payload.next_end = nextEnd
    }
    try {
      const res = await requestVHL(payload)
      await handleRefreshCarriages(true)
      const msgFromServer = res?.message || ''
      if (msgFromServer.includes('Đã gửi lệnh')) {
        showMsg('ok', msgFromServer)
      } else if (msgFromServer.includes('hàng')) {
        showMsg('err', `Thông báo: ${msgFromServer}`)
      } else {
        showMsg('ok', msgFromServer || 'Yêu cầu đã được xử lý')
      }
    } catch (e) {
      showMsg('err', e.message)
    }
  }

  const triggerVHLRequest = () => {
    const actionName = vhlType === 'import' ? 'Cấp hàng' : 'Lấy hàng'
    askConfirmation(
      `Bạn có chắc chắn muốn gửi lệnh ${actionName} cho Toa ${line}?`,
      () => handleRequestVHL()
    )
  }

  const handleUpdateState = async (s) => {
    setMessage(null)
    const newStatus = s.status === 'shelf' ? 'empty' : 'shelf'
    try {
      await updateSlotState({ carriage: s.carriage, slot: s.slot, state: newStatus })
      showMsg('ok', `Toa ${s.carriage} Slot ${s.slot} đã chuyển sang: ${newStatus === 'shelf' ? 'Có hàng' : 'Trống'}`)
      setCarriages((prev) =>
        prev.map((item) =>
          item.carriage === s.carriage && item.slot === s.slot
            ? { ...item, status: newStatus }
            : item
        )
      )
    } catch (e) {
      showMsg('err', e.message)
    }
  }

  const triggerUpdateState = (s) => {
    const nextStatus = s.status === 'shelf' ? 'Trống' : 'Có hàng'
    askConfirmation(
      `Thay đổi trạng thái Toa ${s.carriage} - Slot ${s.slot} thành [${nextStatus}]?`,
      () => handleUpdateState(s)
    )
  }

  const handleRefreshCarriages = async (silent = false) => {
    if (!silent) setMessage(null)
    try {
      const c = await getCarriages()
      setCarriages(c)
      if (!silent) showMsg('ok', 'Đã tải lại trạng thái toa.')
    } catch (e) {
      showMsg('err', e.message)
    }
  }

  const handleSelectNode = (n) => {
    setVhlType(n.type)
    setLine(n.line)
    setStart(n.start)
    setEnd(n.end)
    setNextStart(n.next_start)
    setNextEnd(n.next_end)
  }

  const byCarriage = (carriageId) =>
    carriages
      .filter((s) => s.carriage === carriageId)
      .sort((a, b) => a.slot - b.slot)

  const renderNodeButton = (n) => (
    <button
      key={n.node_name}
      className={`vhl-btn-opt ${vhlType === n.type && line === n.line && start === n.start ? 'active' : ''}`}
      onClick={() => handleSelectNode(n)}
    >
      {n.node_name}
    </button>
  )

  if (loading) return <div className="vhl-app vhl-loading">Đang tải...</div>

  return (
    <div className="vhl-app">
      {/* Header */}
      <header className="vhl-header">
        <img src="/logo_noback.png" alt="Logo" className="vhl-header-logo" />
        <div className="vhl-header-title">
          <h1>VHL Smart Caller</h1>
          <p className="vhl-sub">Giao diện <code>nút bấm</code> để cấp gọi hàng</p>
        </div>
      </header>

      {/* Toast thông báo */}
      {message && (
        <div className={`vhl-toast ${message.type}`}>
          {message.type === 'ok' ? '✓' : '✕'} {message.text}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmToast && (
        <div className="vhl-toast-confirm-overlay">
          <div className="vhl-toast-confirm">
            <div className="vhl-toast-content">
              <span className="vhl-icon">🚚</span>
              <p>{confirmToast.text}</p>
            </div>
            <div className="vhl-toast-actions">
              <button className="vhl-btn-cancel" onClick={() => setConfirmToast(null)}>
                Hủy
              </button>
              <button
                className="vhl-btn-confirm"
                onClick={() => {
                  confirmToast.onConfirm()
                  setConfirmToast(null)
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="vhl-main">
        {/* Panel trái: Chọn node & gửi lệnh */}
        <aside className="vhl-main-left">
          <div className="vhl-selection-display">
            <strong>Đang chọn:</strong> {vhlType.toUpperCase()} - Toa {line}
          </div>

          {/* Card Cấp hàng */}
          <section className="vhl-card2">
            <h2>Cấp hàng vào toa (Chọn điểm)</h2>
            <p className="vhl-hint">Chọn một node bên dưới để tự động cấu hình lệnh:</p>
            <div className="vhl-node-grid">
              {nodes
                .filter((n) => n.type === 'import')
                .map((n) => (
                  <button
                    key={n.node_name}
                    className={`vhl-btn-opt ${vhlType === n.type && line === n.line && start === n.start ? 'active' : ''}`}
                    onClick={() => handleSelectNode(n)}
                  >
                    {n.node_name}
                  </button>
                ))}
            </div>
            <button className="vhl-btn primary full-width" onClick={triggerVHLRequest} style={{ marginTop: '15px' }}>
              Gửi lệnh cấp hàng
            </button>
          </section>

          {/* Card Lấy hàng */}
          <section className="vhl-card">
            <h2>Lấy hàng ra khỏi toa (Chọn điểm)</h2>
            <p className="vhl-hint">Chọn một node bên dưới để tự động cấu hình lệnh:</p>
            <div className="vhl-nodes-container">
              <div className="vhl-node-group">
                <div className="vhl-node-group-label">NÚT CẤP</div>
                <div className="vhl-node-grid">
                  {nodes.filter((n) => n.type === 'supply').map((n) => renderNodeButton(n))}
                </div>
              </div>
              <div className="vhl-node-group">
                <div className="vhl-node-group-label">NÚT TRẢ</div>
                <div className="vhl-node-grid">
                  {nodes.filter((n) => n.type === 'return').map((n) => renderNodeButton(n))}
                </div>
              </div>
              <div className="vhl-node-group">
                <div className="vhl-node-group-label">NÚT LỆNH ĐÔI</div>
                <div className="vhl-node-grid">
                  {nodes.filter((n) => n.type === 'dual').map((n) => renderNodeButton(n))}
                </div>
              </div>
            </div>
            <button className="vhl-btn primary full-width" onClick={triggerVHLRequest} style={{ marginTop: '15px' }}>
              Gửi lệnh lấy hàng
            </button>
          </section>
        </aside>

        {/* Panel phải: Trạng thái toa */}
        <section className="vhl-card vhl-carriage-grid vhl-main-right">
          <div className="vhl-card-head">
            <h2>Trạng thái các toa</h2>
            <button type="button" className="vhl-btn small" onClick={() => handleRefreshCarriages(false)}>
              Làm mới
            </button>
          </div>
          <p className="vhl-hint">
            Giao diện hiển thị <code>Tình trạng</code> các toa hàng của các line
          </p>
          <div className="vhl-grid">
            {LINES.map((c) => (
              <div key={c} className="vhl-carriage">
                <div className="vhl-carriage-title">Toa {c}</div>
                <div className="vhl-slots">
                  {byCarriage(c).map((s) => (
                    <button
                      key={`${s.carriage}-${s.slot}`}
                      type="button"
                      className={`vhl-slot-btn ${s.status}`}
                      onClick={() => triggerUpdateState(s)}
                      aria-label={`Toa ${s.carriage} Chỗ ${s.slot}`}
                    >
                      <span className="vhl-slot-num">{s.slot}</span>
                      <span className="vhl-slot-status">
                        {s.status === 'shelf' ? 'Có hàng' : 'Trống'}
                      </span>
                    </button>
                  ))}
                  {byCarriage(c).length === 0 && (
                    <div className="vhl-no-data">Không có dữ liệu</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default VHLInterface
