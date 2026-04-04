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
          line: mergedData.line,  // ← BẮT BUỘC: Field line cho backend
          process_code: mergedData.process_code || "",
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


  const thClass = "font-semibold text-white py-3 px-2 lg:py-4 lg:px-3 text-base lg:text-lg min-w-0";
  const tdClass = "py-2 px-2 lg:py-3 lg:px-3 min-w-0";
  const inputClass = "text-sm lg:text-base border-0 bg-transparent focus:bg-white focus:border focus:border-gray-300 min-w-0";

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <Table className="text-base lg:text-lg table-fixed w-full max-w-full">
        <TableHeader>
          <TableRow>
            <TableHead className={`${thClass} w-[20%]`}>{t('settings.nodeName')}</TableHead>
            <TableHead className={`${thClass} w-[18%]`}>{t('settings.process')}</TableHead>
            <TableHead className={`${thClass} w-[12%]`}>{t('settings.start')}</TableHead>
            <TableHead className={`${thClass} w-[12%]`}>{t('settings.end')}</TableHead>
            {selectedNodeTypes === 'both' && (
              <>
                <TableHead className={`${thClass} w-[14%]`}>{t('settings.nextStart')}</TableHead>
                <TableHead className={`${thClass} w-[14%]`}>{t('settings.nextEnd')}</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cells.map((cell) => (
            <TableRow key={cell.id}>
              <TableCell className={tdClass}>
                <Input
                  type="text"
                  value={(editedById[cell.id]?.node_name ?? cell.node_name) || ''}
                  onChange={(e) => handleChange(cell.id, 'node_name', e.target.value)}
                  placeholder={t('settings.nameForPlaceholder', { name: cell.node_name || '' })}
                  className={inputClass}
                />
              </TableCell>
              <TableCell className={tdClass}>
                <Input
                  type="text"
                  value={(editedById[cell.id]?.process_code ?? cell.process_code) || ''}
                  onChange={(e) => handleChange(cell.id, 'process_code', e.target.value)}
                  placeholder={t('settings.processForPlaceholder', { name: cell.node_name || '' })}
                  className={inputClass}
                />
              </TableCell>
              <TableCell className={tdClass}>
                <Input
                  type="text"
                  value={(editedById[cell.id]?.start ?? cell.start) || ''}
                  onChange={(e) => handleChange(cell.id, 'start', e.target.value)}
                  placeholder={t('settings.start')}
                  className={inputClass}
                />
              </TableCell>
              <TableCell className={tdClass}>
                <Input
                  type="text"
                  value={(editedById[cell.id]?.end ?? cell.end) || ''}
                  onChange={(e) => handleChange(cell.id, 'end', e.target.value)}
                  placeholder={t('settings.end')}
                  className={inputClass}
                />
              </TableCell>
              {selectedNodeTypes === 'both' && (
                <>
              <TableCell className={tdClass}>
                <Input
                  type="text"
                  value={(editedById[cell.id]?.next_start ?? cell.next_start) || ''}
                  onChange={(e) => handleChange(cell.id, 'next_start', e.target.value)}
                  placeholder={t('settings.nextStart')}
                  className={inputClass}
                />
              </TableCell>
              <TableCell className={tdClass}>
                <Input
                  type="text"
                  value={(editedById[cell.id]?.next_end ?? cell.next_end) || ''}
                  onChange={(e) => handleChange(cell.id, 'next_end', e.target.value)}
                  placeholder={t('settings.nextEnd')}
                  className={inputClass}
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