import React from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// lấy hook từ collection task_path_{username}_{khu}
const GridPreview = ({ columns, cells, onDeleteCell, selectedNodeType }) => {
  const rows = Math.ceil(cells.length / columns);
  const {t} = useTranslation();
  // Hàm xác định màu nền dựa trên node_type
  const getBackgroundColor = (nodeType) => {
    switch(nodeType) {
      case 'supply':
        return '#D3D3D3'; // Màu xám
      case 'returns':
        return '#ADD8E6'; // Màu xanh nước biển nhạt
      case 'both':
        return '#1C9B9B'; // Màu #1C9B9B
      default:
        return 'transparent';
    }
  };
  
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-white">{t('settings.gridPreview')}</h3>
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
            className="border-2 border-border rounded flex flex-col items-center justify-center p-2 hover:border-primary transition-colors relative group"
            style={{ 
              height: 130,
              backgroundColor: getBackgroundColor(cell.node_type)
            }}
          >
            {/* Nút xóa hiện khi hover */}
            {onDeleteCell && (
              <button
                onClick={() => onDeleteCell(cell.id)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                title={t('settings.deleteCell')}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            
            <div className="text-center space-y-1">
              <p className="text-xs font-mono text-muted-foreground">{cell.node_name}</p>
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