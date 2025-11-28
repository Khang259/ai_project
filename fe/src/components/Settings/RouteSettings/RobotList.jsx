import React, { useState, useEffect } from 'react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Plus, Trash2, Edit2, X } from 'lucide-react';

const RobotList = ({ route, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [robotList, setRobotList] = useState(route.robot_list || []);

  const handleAddRobot = () => {
    setRobotList([...robotList, '']);
  };

  const handleUpdateRobot = (index, value) => {
    const newList = [...robotList];
    newList[index] = value;
    setRobotList(newList);
  };

  const handleDeleteRobot = (index) => {
    const newList = robotList.filter((_, idx) => idx !== index);
    setRobotList(newList);
  };

  const handleSave = () => {
    const filteredList = robotList.filter(robot => robot.trim().length > 0);
    onUpdate(route.id, filteredList);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setRobotList(route.robot_list || []);
    setIsEditing(false);
  };

  // Cập nhật robotList khi route.robot_list thay đổi
  useEffect(() => {
    setRobotList(route.robot_list || []);
  }, [route.robot_list]);

  if (isEditing) {
    return (
      <div className="space-y-2 min-w-[300px]">
        <div className="space-y-1">
          {robotList.map((robot, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                value={robot}
                onChange={(e) => handleUpdateRobot(idx, e.target.value)}
                className="bg-white/10 text-white text-sm border-white/20"
                placeholder={`Robot ${idx + 1}`}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteRobot(idx)}
                className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2 items-center">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddRobot}
              className="flex-1 text-white border-white/20 hover:bg-white/10"
            >
              <Plus className="h-3 w-3 mr-1" />
              Thêm Robot
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Lưu
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
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-wrap gap-1">
        {robotList.length > 0 ? (
          robotList.map((robot, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-blue-500/20 text-blue-200 rounded text-xs"
            >
              {robot}
            </span>
          ))
        ) : (
          <span className="text-gray-400 text-xs">Chưa có robot</span>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
      >
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default RobotList;

