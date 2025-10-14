import React from 'react';
import { Input } from '../ui/input';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '../ui/table';

const CellNameEditor = ({ cells, onUpdateCell }) => {
  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px] font-semibold">Node Name</TableHead>
            <TableHead className="w-[150px] font-semibold">Tên mới</TableHead>
            <TableHead className="w-[120px] font-semibold">Start</TableHead>
            <TableHead className="w-[120px] font-semibold">End</TableHead>
            <TableHead className="w-[120px] font-semibold">Next Start</TableHead>
            <TableHead className="w-[120px] font-semibold">Next End</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cells.map((cell) => (
            <TableRow key={cell.id}>
              <TableCell className="font-mono text-sm text-muted-foreground">
                {cell.node_name}
              </TableCell>
              <TableCell>
                <Input
                  type="text"
                  value={cell.name || ''}
                  onChange={(e) => {
                    console.log('Name input changed:', { cellId: cell.id, value: e.target.value });
                    onUpdateCell(cell.id, 'name', e.target.value);
                  }}
                  placeholder={`Tên cho ${cell.node_name}`}
                  className="text-sm border-0 bg-transparent focus:bg-white focus:border focus:border-gray-300"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="text"
                  value={cell.start || ''}
                  onChange={(e) => onUpdateCell(cell.id, 'start', e.target.value)}
                  placeholder={`Start cho ${cell.node_name}`}
                  className="text-sm border-0 bg-transparent focus:bg-white focus:border focus:border-gray-300"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="text"
                  value={cell.end || ''}
                  onChange={(e) => onUpdateCell(cell.id, 'end', e.target.value)}
                  placeholder={`End cho ${cell.node_name}`}
                  className="text-sm border-0 bg-transparent focus:bg-white focus:border focus:border-gray-300"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="text"
                  value={cell.next_start || ''}
                  onChange={(e) => onUpdateCell(cell.id, 'next_start', e.target.value)}
                  placeholder={`Next start cho ${cell.node_name}`}
                  className="text-sm border-0 bg-transparent focus:bg-white focus:border focus:border-gray-300"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="text"
                  value={cell.next_end || ''}
                  onChange={(e) => onUpdateCell(cell.id, 'next_end', e.target.value)}
                  placeholder={`Next end cho ${cell.node_name}`}
                  className="text-sm border-0 bg-transparent focus:bg-white focus:border focus:border-gray-300"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CellNameEditor;
