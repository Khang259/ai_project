import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '../ui/table';
import { useTranslation } from 'react-i18next';

const CellNameEditor = ({ cells, handleUpdateBatch }) => {
  const { t } = useTranslation();
  const [editedById, setEditedById] = useState({}); //Các thay đổi 
  const [selectedNodeTypes, setSelectedNodeTypes] = useState('');
  useEffect(() => {
    if (cells.length > 0) {
      setSelectedNodeTypes(cells[0].node_type);  
    }
  }, [cells]);
  

  const handleChange = (id, field, value) => {
    setEditedById((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    const changedIds = Object.keys(editedById);
    if (changedIds.length === 0) {
      handleUpdateBatch({ nodes: [] });
      return;
    }

    const changedNodes = cells
      .filter((cell) => changedIds.includes(String(cell.id)))
      .map((cell) => {
        const mergedData = {
          ...cell,
          ...(editedById[cell.id] || {}),
        }
        const cleanNode = {
          id: mergedData.id,
          node_name: mergedData.node_name,
          node_type: mergedData.node_type,
          owner: mergedData.owner,
          start: mergedData.start,
          end: mergedData.end,
          next_start: mergedData.next_start,
          next_end: mergedData.next_end,
        };

        return cleanNode;
      });

    console.log("changedNodes", changedNodes);
    handleUpdateBatch(changedNodes);
};


  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px] font-semibold text-white">{t('settings.nodeName')}</TableHead>
            <TableHead className="w-[120px] font-semibold text-white">{t('settings.start')}</TableHead>
            <TableHead className="w-[120px] font-semibold text-white">{t('settings.end')}</TableHead>
            {selectedNodeTypes === 'both' && (
              <>
                <TableHead className="w-[120px] font-semibold text-white">{t('settings.nextStart')}</TableHead>
                <TableHead className="w-[120px] font-semibold text-white">{t('settings.nextEnd')}</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cells.map((cell) => (
            <TableRow key={cell.id}>
              <TableCell>
                <Input
                  type="text"
                  value={(editedById[cell.id]?.node_name ?? cell.node_name) || ''}
                  onChange={(e) => handleChange(cell.id, 'node_name', e.target.value)}
                  placeholder={`Tên cho ${cell.node_name}`}
                  className="text-sm border-0 bg-transparent focus:bg-white focus:border focus:border-gray-300"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="text"
                  value={(editedById[cell.id]?.start ?? cell.start) || ''}
                  onChange={(e) => handleChange(cell.id, 'start', e.target.value)}
                  placeholder={`Start cho ${cell.node_name}`}
                  className="text-sm border-0 bg-transparent focus:bg-white focus:border focus:border-gray-300"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="text"
                  value={(editedById[cell.id]?.end ?? cell.end) || ''}
                  onChange={(e) => handleChange(cell.id, 'end', e.target.value)}
                  placeholder={`End cho ${cell.node_name}`}
                  className="text-sm border-0 bg-transparent focus:bg-white focus:border focus:border-gray-300"
                />
              </TableCell>
              {selectedNodeTypes === 'both' && (
                <>
              <TableCell>
                <Input
                  type="text"
                  value={(editedById[cell.id]?.next_start ?? cell.next_start) || ''}
                  onChange={(e) => handleChange(cell.id, 'next_start', e.target.value)}
                  placeholder={`Next start cho ${cell.node_name}`}
                  className="text-sm border-0 bg-transparent focus:bg-white focus:border focus:border-gray-300"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="text"
                  value={(editedById[cell.id]?.next_end ?? cell.next_end) || ''}
                  onChange={(e) => handleChange(cell.id, 'next_end', e.target.value)}
                  placeholder={`Next end cho ${cell.node_name}`}
                  className="text-sm border-0 bg-transparent focus:bg-white focus:border focus:border-gray-300"
                />
              </TableCell>
              </>
            )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end mt-4">
        {/* <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">
          Lưu Cấu Hình Nút
        </Button> */}
      </div>
    </div>
  );
};

export default CellNameEditor;