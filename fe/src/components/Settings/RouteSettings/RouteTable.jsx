import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Plus, Route, Trash2, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRoute } from '@/hooks/Setting/useRoute';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import UpdateRoutes from './UpdateRoutes';
import RobotList from './RobotList';

const RouteSettings = () => {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const isAdmin = auth?.user?.roles?.includes('admin');
  const isOperator = auth?.user?.roles?.includes('operator');
  const { routes, loading, createRoute, updateRoute, deleteRoute, getRoutesByCreator, fetchRoutes } = useRoute();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    route_name: '',
    route_id: '',
    robot_list: [],
  });
  const [localErrors, setLocalErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newlyAddedId, setNewlyAddedId] = useState(null);
  const tableRef = useRef(null);

  // Fetch routes dựa trên role của user
  useEffect(() => {
    const loadRoutes = async () => {
      if (!auth?.user) return;
      
      try {
        if (isOperator && !isAdmin) {
          // Operator: chỉ lấy routes của chính họ
          await getRoutesByCreator(auth.user.username);
          console.log('[DEBUG-RouteList]', getRoutesByCreator)
        } else if (isAdmin) {
          // Admin: lấy tất cả routes
          await fetchRoutes();
        }
      } catch (error) {
        console.error('Error fetching routes:', error);
        toast.error(t('settings.loadRoutesError') || 'Có lỗi xảy ra khi tải routes');
      }
    };
    
    loadRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.user?.username, auth?.user?.roles, isAdmin, isOperator]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (localErrors[field]) {
      setLocalErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.route_name?.trim()) {
      newErrors.route_name = t('settings.routeNameRequired') || 'Route Name là bắt buộc';
    }
    
    if (!formData.route_id?.trim()) {
      newErrors.route_id = t('settings.routeIdRequired') || 'Route ID là bắt buộc';
    }
    
    setLocalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddRoute = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const routeData = {
        route_id: parseInt(formData.route_id) || formData.route_id,
        route_name: formData.route_name.trim(),
        group_id: formData.group_id || 0,
        robot_list: formData.robot_list || [],
      };

      const createdRoute = await createRoute(routeData);
      
      toast.success(t('settings.addRouteSuccess') || 'Thêm route thành công');
      
      setNewlyAddedId(createdRoute.id);
      setShowAddForm(false);
      setFormData({
        route_name: '',
        route_id: '',
        group_id: 0,
        robot_list: [],
      });
      setLocalErrors({});
      
      setTimeout(() => {
        if (tableRef.current) {
          tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        setTimeout(() => setNewlyAddedId(null), 3000);
      }, 100);
    } catch (error) {
      console.error('Error creating route:', error);
      toast.error(error.response?.data?.detail || t('settings.addRouteError') || 'Có lỗi xảy ra khi tạo route');
      setLocalErrors({
        submit: error.response?.data?.detail || 'Có lỗi xảy ra khi tạo route'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoute = async (id) => {
    if (window.confirm(t('settings.confirmDeleteRoute') || 'Bạn có chắc chắn muốn xóa route này?')) {
      try {
        await deleteRoute(id);
        toast.success(t('settings.deleteRouteSuccess') || 'Xóa route thành công');
      } catch (error) {
        console.error('Error deleting route:', error);
        toast.error(error.response?.data?.detail || t('settings.deleteRouteError') || 'Có lỗi xảy ra khi xóa route');
      }
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setFormData({
      route_name: '',
      route_id: '',
      robot_list: [],
    });
    setLocalErrors({});
  };

  const handleUpdateRobotList = async (routeId, robotList) => {
    try {
      const route = routes.find(r => r.id === routeId);
      if (!route) return;
      
      await updateRoute(routeId, {
        route_id: route.route_id,
        route_name: route.route_name,
        group_id: route.group_id || 0,
        robot_list: robotList,
      });
      toast.success(t('settings.updateRouteSuccess') || 'Cập nhật robot list thành công');
    } catch (error) {
      console.error('Error updating robot list:', error);
      toast.error(error.response?.data?.detail || t('settings.updateRouteError') || 'Có lỗi xảy ra khi cập nhật robot list');
    }
  };

  const handleUpdateRoute = async (routeId, formData) => {
    try {
      const route = routes.find(r => r.id === routeId);
      if (!route) return;
      
      await updateRoute(routeId, {
        route_id: parseInt(formData.route_id) || formData.route_id,
        route_name: formData.route_name.trim(),
        group_id: route.group_id || 0,
        robot_list: route.robot_list || [],
      });
      toast.success(t('settings.updateRouteSuccess') || 'Cập nhật route thành công');
    } catch (error) {
      console.error('Error updating route:', error);
      toast.error(error.response?.data?.detail || t('settings.updateRouteError') || 'Có lỗi xảy ra khi cập nhật route');
    }
  };

  const handleSaveRoute = async (routeId) => {
    try {
      const route = routes.find(r => r.id === routeId);
      if (!route) return;
      
      // Lưu tất cả thay đổi hiện tại của route
      await updateRoute(routeId, {
        route_id: route.route_id,
        route_name: route.route_name,
        group_id: route.group_id || 0,
        robot_list: route.robot_list || [],
      });
      toast.success(t('settings.saveRouteSuccess') || 'Lưu route thành công');
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error(error.response?.data?.detail || t('settings.saveRouteError') || 'Có lỗi xảy ra khi lưu route');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            {t('settings.routeSettings') || 'Route Settings'}
          </CardTitle>
          <CardDescription>
            <span className="text-xs text-white">
              {t('settings.routeSettingsDescription') || 'Quản lý danh sách routes theo group và user'}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bảng danh sách routes */}
          <div ref={tableRef} className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-white">Route Name</TableHead>
                  <TableHead className="text-white">Route ID</TableHead>
                  <TableHead className="text-white">User</TableHead>
                  <TableHead className="text-white">Robot List</TableHead>
                  <TableHead className="text-white">Created At</TableHead>
                  <TableHead className="text-white">Created By</TableHead>
                  <TableHead className="text-white text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                      {t('settings.loading') || 'Đang tải...'}
                    </TableCell>
                  </TableRow>
                ) : routes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                      {t('settings.noRoutes') || 'Chưa có route nào. Nhấn nút "Thêm mới" để thêm route.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  routes.map((route) => (
                    <TableRow 
                      key={route.id} 
                      className={`text-white transition-all duration-500 ${
                        newlyAddedId === route.id 
                          ? 'bg-green-500/20 border-green-500 border-2' 
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <TableCell className="font-medium">
                        <UpdateRoutes 
                          route={route} 
                          onUpdate={handleUpdateRoute}
                        />
                      </TableCell>
                      <TableCell>
                        {route.route_id}
                      </TableCell>
                      <TableCell>{route.user || '-'}</TableCell>
                      <TableCell>
                        <RobotList 
                          route={route} 
                          onUpdate={handleUpdateRobotList}
                        />
                      </TableCell>
                      <TableCell>
                        {route.created_at 
                          ? new Date(route.created_at).toLocaleString('vi-VN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })
                          : '-'}
                      </TableCell>
                      <TableCell>{route.created_by || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRoute(route.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveRoute(route.id)}
                          className="text-green-500 hover:text-green-700 hover:bg-green-500/10"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Form thêm mới */}
          {showAddForm && (
            <Card className="border border-red-500 bg-blue-500/10">
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('settings.addNewRoute') || 'Thêm Route Mới'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Route Name */}
                  <div className="space-y-2">
                    <Label htmlFor="route_name" className="text-white">
                      {t('settings.routeName') || 'Route Name'}
                    </Label>
                    <Input
                      id="route_name"
                      type="text"
                      placeholder={t('settings.routeNamePlaceholder') || 'Nhập Route Name'}
                      value={formData.route_name}
                      onChange={(e) => handleInputChange('route_name', e.target.value)}
                      className={`bg-white text-black ${localErrors.route_name ? 'border-red-500' : ''}`}
                    />
                    {localErrors.route_name && (
                      <p className="text-xs text-red-500">{localErrors.route_name}</p>
                    )}
                  </div>

                  {/* Route ID */}
                  <div className="space-y-2">
                    <Label htmlFor="route_id" className="text-white">
                      {t('settings.routeId') || 'Route ID'}
                    </Label>
                    <Input
                      id="route_id"
                      type="text"
                      placeholder={t('settings.routeIdPlaceholder') || 'Nhập Route ID'}
                      value={formData.route_id}
                      onChange={(e) => handleInputChange('route_id', e.target.value)}
                      className={`bg-white text-black ${localErrors.route_id ? 'border-red-500' : ''}`}
                    />
                    {localErrors.route_id && (
                      <p className="text-xs text-red-500">{localErrors.route_id}</p>
                    )}
                  </div>
                </div>

                {/* Error message */}
                {localErrors.submit && (
                  <div className="text-xs text-red-500">{localErrors.submit}</div>
                )}

                {/* Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                  >
                    {t('settings.cancel') || 'Hủy'}
                  </Button>
                  {/* Chỉ thêm các rows hàng nhưng chưa lưu */}
                  <Button
                    onClick={handleAddRoute}
                    disabled={isSubmitting}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('settings.add') || 'Thêm'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nút thêm mới */}
          {!showAddForm && (
            <div className="flex justify-end gap-2">
              {/* Add Button */}
              <Button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('settings.addNewRoute') || 'Thêm Route Mới'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RouteSettings;