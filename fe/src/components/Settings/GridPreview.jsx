import React from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// lấy hook từ collection task_path_{username}_{khu}
const GridPreview = ({ columns, cells, onDeleteCell, selectedNodeType }) => {
  const rows = Math.ceil(cells.length / columns);
  
  const LINE_COLORS = {
    'Line 1': '#016B61', 'Line 2': '#2563EB', 'Line 3': '#DC2626', 'Line 4': '#9333EA', 'Line 5': '#EA580C',
    'Line 6': '#059669', 'Line 7': '#DB2777', 'Line 8': '#7C3AED', 'Line 9': '#0891B2', 'Line 10': '#CA8A04',
  };
  const getLineColor = (lineName) => {
    if (LINE_COLORS[lineName]) return LINE_COLORS[lineName];
    let h = 0;
    for (let i = 0; i < (lineName || '').length; i++) h = ((h << 5) - h) + (lineName || '').charCodeAt(i) | 0;
    return '#' + (Math.abs(h) % 0xFFFFFF).toString(16).padStart(6, '0');
  };

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
      case 'auto':
        return '#FFD700'; // Màu vàng (Gold)
      default:
        return 'transparent';
    }
  };
  
  return (
    <div className="space-y-3 min-w-0">
      <h3 className="text-base lg:text-lg font-medium text-white">{t('settings.gridPreview')}</h3>
      <div
        className="grid gap-2 p-3 lg:p-4 bg-muted/30 rounded-lg border max-w-full"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, auto)`,
        }}
      >
        {cells.slice(0, rows * columns).map((cell) => (
          <div
            key={cell.id}
            className="border-2 border-border rounded flex flex-col items-center justify-center p-2 hover:border-primary transition-colors relative group overflow-hidden min-w-0"
            style={{ 
              height: 140,
              backgroundColor: getBackgroundColor(cell.node_type)
            }}
          >
            {cell.line && (
              <div 
                className="absolute top-0 left-0 right-0 h-4 rounded-t"
                style={{ backgroundColor: getLineColor(cell.line) }}
              />
            )}
            {onDeleteCell && (
              <button
                onClick={() => onDeleteCell(cell.id)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5"
                title={t('settings.deleteCell')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <div className="text-center space-y-1 min-w-0 px-0.5">
              <p className="text-sm font-mono text-muted-foreground truncate">{cell.node_name}</p>
              {cell.line && (
                <p className="text-xs lg:text-sm font-semibold px-2 py-0.5 rounded" style={{ 
                  color: getLineColor(cell.line),
                  backgroundColor: `${getLineColor(cell.line)}15`
                }}>
                  {cell.line}
                </p>
              )}
              <div className="flex flex-col gap-1 justify-center mt-2 gap-y-4">
                <span className="px-2 py-0.5 bg-primary/30 text-primary text-xs lg:text-sm font-semibold rounded">
                  {cell.start} → {cell.end}
                </span>
                {selectedNodeType === 'both' && cell.next_start > 0 && cell.next_end > 0 && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs lg:text-sm font-semibold rounded">
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