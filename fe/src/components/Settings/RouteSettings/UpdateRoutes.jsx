import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Edit2, X, Check } from 'lucide-react';

const UpdateRoutes = ({ route, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    route_name: route.route_name || '',
    route_id: route.route_id || '',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onUpdate(route.id, formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      route_name: route.route_name || '',
      route_id: route.route_id || '',
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex gap-2 items-center flex-wrap">
        <Input
          value={formData.route_name}
          onChange={(e) => handleInputChange('route_name', e.target.value)}
          className="bg-white/10 text-white text-sm border-white/20 w-32"
          placeholder="Route Name"
        />
        <Input
          value={formData.route_id}
          onChange={(e) => handleInputChange('route_id', e.target.value)}
          className="bg-white/10 text-white text-sm border-white/20 w-24"
          placeholder="Route ID"
        />
        <Button
          size="sm"
          onClick={handleSave}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          className="text-white hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
        title="Chỉnh sửa route"
      >
        <Edit2 className="h-4 w-4" />
      </Button>
      <span>{route.route_name}</span>
    </div>
  );
};

export default UpdateRoutes;

