import React from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const CellNameEditor = ({ cells, onUpdateCell }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cells.map((cell) => (
        <div key={cell.id} className="space-y-2">
          <Label htmlFor={cell.id} className="text-xs font-mono text-muted-foreground">
            {cell.id}
          </Label>
          <Input
            id={cell.id}
            type="text"
            value={cell.name}
            onChange={(e) => onUpdateCell(cell.id, e.target.value)}
            placeholder={`Tên cho ${cell.id}`}
            className="text-sm"
          />
        </div>
      ))}
    </div>
  );
};

export default CellNameEditor;
