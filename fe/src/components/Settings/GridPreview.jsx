import React from 'react';
import { Trash2 } from 'lucide-react';

// lấy hook từ collection task_path_{username}_{khu}
const GridPreview = ({ columns, cells, onDeleteCell, selectedNodeType }) => {
  const rows = Math.ceil(cells.length / columns);
  
  // Color palette cho các lines
  const LINE_COLORS = {
    'Line 1': '#016B61',   // Teal Green
    'Line 2': '#2563EB',   // Blue
    'Line 3': '#DC2626',   // Red
    'Line 4': '#9333EA',   // Purple
    'Line 5': '#EA580C',   // Orange
    'Line 6': '#059669',   // Emerald
    'Line 7': '#DB2777',   // Pink
    'Line 8': '#7C3AED',   // Violet
    'Line 9': '#0891B2',   // Cyan
    'Line 10': '#CA8A04',  // Yellow
  };
  
  // Hàm xác định màu nền dựa trên node_type
  const getBackgroundColor = (nodeType) => {
    switch(nodeType) {
      case 'supply':
        return '#D3D3D3'; // Màu xám
      case 'returns':
        return '#ADD8E6'; // Màu xanh nước biển nhạt
      case 'both':
        return '#1C9B9B'; // Màu #1C9B9B
      case 'auto':
        return '#FFD700'; // Màu vàng (Gold)
      default:
        return 'transparent';
    }
  };
  
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Xem Trước Lưới</h3>
      <div
        className="grid gap-2 p-4 bg-muted/30 rounded-lg border"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, auto)`,
        }}
      >
        {cells.slice(0, rows * columns).map((cell, index) => (
          <div
            key={cell.id}
            className="border-2 border-border rounded flex flex-col items-center justify-center p-2 hover:border-primary transition-colors relative group overflow-hidden"
            style={{ 
              height: 130,
              backgroundColor: getBackgroundColor(cell.node_type)
            }}
          >
            {/* Top Color Bar cho Line */}
            {cell.line && (
              <div 
                className="absolute top-0 left-0 right-0 h-4 rounded-t"
                style={{ backgroundColor: LINE_COLORS[cell.line] || '#016B61' }}
              />
            )}
            
            {/* Nút xóa hiện khi hover */}
            {onDeleteCell && (
              <button
                onClick={() => onDeleteCell(cell.id)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-1 z-10"
                title="Xóa ô này"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            
            <div className="text-center space-y-1">
              <p className="text-xs font-mono text-muted-foreground">{cell.node_name}</p>
              
              {/* Hiển thị Line text */}
              {cell.line && (
                <p className="text-xs font-semibold px-2 py-0.5 rounded" style={{ 
                  color: LINE_COLORS[cell.line] || '#016B61',
                  backgroundColor: `${LINE_COLORS[cell.line] || '#016B61'}15`
                }}>
                  {cell.line}
                </p>
              )}
              
              <div className="flex flex-col gap-1 justify-center mt-2 gap-y-4">
                <span className="px-2 py-0.5 bg-primary/30 text-primary text-xs font-semibold rounded">
                  {cell.start} → {cell.end}
                </span>
                {selectedNodeType === 'both' && cell.next_start > 0 && cell.next_end > 0 && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded">
                    {cell.next_start} → {cell.next_end}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GridPreview;