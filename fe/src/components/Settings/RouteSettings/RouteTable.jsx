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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Route, Trash2, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRoute } from '@/hooks/Setting/useRoute';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getAllAreas } from '@/services/area';
import UpdateRoutes from './UpdateRoutes';
import RobotList from './RobotList';

const RouteSettings = () => {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const isAdmin = auth?.user?.roles?.includes('admin');
  const isOperator = auth?.user?.roles?.includes('operator');
  const { routes, loading, createRoute, updateRoute, deleteRoute, getRoutesByCreator, fetchRoutes } = useRoute();
  const [showAddForm, setShowAddForm] = useState(false);
  const [areas, setAreas] = useState([]);
  const [formData, setFormData] = useState({
    route_name: '',
    route_id: '',
    area_id: '',
    group_id: 0,
    robot_list: [],
    robot_list_str: '',
  });
  const [localErrors, setLocalErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newlyAddedId, setNewlyAddedId] = useState(null);
  const tableRef = useRef(null);

  useEffect(() => {
    getAllAreas()
      .then((data) => setAreas(Array.isArray(data) ? data : []))
      .catch(() => setAreas([]));
  }, []);

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
        toast.error(t('settings.loadRoutesError'));
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
      newErrors.route_name = t('settings.routeNameRequired');
    }

    if (!formData.route_id?.trim()) {
      newErrors.route_id = t('settings.routeIdRequired');
    }

    if (formData.area_id === '' || formData.area_id == null) {
      newErrors.area_id = t('settings.routeAreaRequired');
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
      const robotList = formData.robot_list_str?.trim()
        ? formData.robot_list_str.split(',').map((s) => s.trim()).filter(Boolean)
        : (formData.robot_list || []);

      const routeData = {
        route_id: parseInt(formData.route_id, 10) || formData.route_id,
        route_name: formData.route_name.trim(),
        area_id: parseInt(formData.area_id, 10),
        group_id: parseInt(formData.group_id, 10) || 0,
        robot_list: robotList,
      };

      const createdRoute = await createRoute(routeData);

      toast.success(t('settings.addRouteSuccess'));

      setNewlyAddedId(createdRoute.id);
      setShowAddForm(false);
      setFormData({
        route_name: '',
        route_id: '',
        area_id: '',
        group_id: 0,
        robot_list: [],
        robot_list_str: '',
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
      toast.error(error.response?.data?.detail || t('settings.addRouteError'));
      setLocalErrors({
        submit: error.response?.data?.detail || t('settings.addRouteError')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoute = async (id) => {
    if (window.confirm(t('settings.confirmDeleteRoute'))) {
      try {
        await deleteRoute(id);
        toast.success(t('settings.deleteRouteSuccess'));
      } catch (error) {
        console.error('Error deleting route:', error);
        toast.error(error.response?.data?.detail || t('settings.deleteRouteError'));
      }
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setFormData({
      route_name: '',
      route_id: '',
      area_id: '',
      group_id: 0,
      robot_list: [],
      robot_list_str: '',
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
      toast.success(t('settings.updateRouteSuccess'));
    } catch (error) {
      console.error('Error updating robot list:', error);
      toast.error(error.response?.data?.detail || t('settings.updateRouteError'));
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
      toast.success(t('settings.updateRouteSuccess'));
    } catch (error) {
      console.error('Error updating route:', error);
      toast.error(error.response?.data?.detail || t('settings.updateRouteError'));
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
      toast.success(t('settings.saveRouteSuccess'));
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error(error.response?.data?.detail || t('settings.saveRouteError'));
    }
  };

  const thClass = "text-white py-3 px-2 lg:py-4 lg:px-3 text-base lg:text-lg font-semibold";
  const tdClass = "text-white py-3 px-2 lg:py-4 lg:px-3 text-base lg:text-lg";

  return (
    <div className="space-y-6 min-w-0">
      <Card className="border-2 glass min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl lg:text-2xl text-white">
            <Route className="h-6 w-6 lg:h-7 lg:w-7" />
            {t('settings.routeSettings')}
          </CardTitle>
          <CardDescription>
            <span className="text-sm lg:text-base text-white/90">
              {t('settings.routeSettingsDescription')}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 min-w-0">
          <div ref={tableRef} className="border rounded-lg overflow-hidden min-w-0 overflow-x-auto">
            <Table className="text-base lg:text-lg w-full min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className={thClass}>{t('settings.routeName')}</TableHead>
                  <TableHead className={thClass}>{t('settings.routeId')}</TableHead>
                  <TableHead className={thClass}>{t('settings.routeUser')}</TableHead>
                  <TableHead className={thClass}>{t('settings.routeRobotList')}</TableHead>
                  <TableHead className={thClass}>{t('settings.routeCreatedAt')}</TableHead>
                  <TableHead className={thClass}>{t('settings.routeCreatedBy')}</TableHead>
                  <TableHead className={`${thClass} text-center`}>{t('settings.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className={`text-center text-gray-400 py-8 ${tdClass}`}>
                      {t('settings.loading')}
                    </TableCell>
                  </TableRow>
                ) : routes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className={`text-center text-gray-400 py-8 ${tdClass}`}>
                      {t('settings.noRoutes')}
                    </TableCell>
                  </TableRow>
                ) : (
                  routes.map((route) => (
                    <TableRow
                      key={route.id}
                      className={`text-white transition-all duration-500 ${newlyAddedId === route.id
                          ? 'bg-green-500/20 border-green-500 border-2'
                          : 'hover:bg-white/5'
                        }`}
                    >
                      <TableCell className={`font-medium ${tdClass}`}>
                        <UpdateRoutes
                          route={route}
                          onUpdate={handleUpdateRoute}
                        />
                      </TableCell>
                      <TableCell className={tdClass}>{route.route_id}</TableCell>
                      <TableCell className={tdClass}>{route.user || '-'}</TableCell>
                      <TableCell className={tdClass}>
                        <RobotList
                          route={route}
                          onUpdate={handleUpdateRobotList}
                        />
                      </TableCell>
                      <TableCell className={tdClass}>
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
                      <TableCell className={tdClass}>{route.created_by || '-'}</TableCell>
                      <TableCell className={`text-center ${tdClass}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRoute(route.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-500/10 h-9 lg:h-10 w-9 lg:w-10 p-0"
                        >
                          <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveRoute(route.id)}
                          className="text-green-500 hover:text-green-700 hover:bg-green-500/10 h-9 lg:h-10 w-9 lg:w-10 p-0"
                        >
                          <Save className="h-4 w-4 lg:h-5 lg:w-5" />
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
            <Card className="border border-red-500 bg-blue-500/10 min-w-0">
              <CardHeader>
                <CardTitle className="text-lg lg:text-xl text-white">
{t('settings.addNewRoute')}
              </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="route_name" className="text-white text-base lg:text-lg">
                      {t('settings.routeName')}
                    </Label>
                    <Input
                      id="route_name"
                      type="text"
                      placeholder={t('settings.routeNamePlaceholder')}
                      value={formData.route_name}
                      onChange={(e) => handleInputChange('route_name', e.target.value)}
                      className={`bg-white text-black text-base lg:text-lg h-10 lg:h-11 ${localErrors.route_name ? 'border-red-500' : ''}`}
                    />
                    {localErrors.route_name && (
                      <p className="text-sm text-red-500">{localErrors.route_name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="route_id" className="text-white text-base lg:text-lg">
                      {t('settings.routeId')}
                    </Label>
                    <Input
                      id="route_id"
                      type="text"
                      placeholder={t('settings.routeIdPlaceholder')}
                      value={formData.route_id}
                      onChange={(e) => handleInputChange('route_id', e.target.value)}
                      className={`bg-white text-black text-base lg:text-lg h-10 lg:h-11 ${localErrors.route_id ? 'border-red-500' : ''}`}
                    />
                    {localErrors.route_id && (
                      <p className="text-sm text-red-500">{localErrors.route_id}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-base lg:text-lg">
                      {t('settings.area')}
                    </Label>
                    <Select
                      value={formData.area_id === '' || formData.area_id == null ? 'none' : String(formData.area_id)}
                      onValueChange={(v) => handleInputChange('area_id', v === 'none' ? '' : v)}
                    >
                      <SelectTrigger
                        className={`bg-white text-black text-base lg:text-lg h-10 lg:h-11 ${localErrors.area_id ? 'border-red-500' : ''}`}
                      >
                        <SelectValue placeholder={t('area.selectArea')} />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.map((area) => (
                          <SelectItem
                            key={area.area_id}
                            value={String(area.area_id)}
                          >
                            {area.area_name ?? area.name ?? String(area.area_id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {localErrors.area_id && (
                      <p className="text-sm text-red-500">{localErrors.area_id}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group_id" className="text-white text-base lg:text-lg">
                      {t('settings.routeGroupId')}
                    </Label>
                    <Input
                      id="group_id"
                      type="number"
                      min={0}
                      placeholder={t('settings.routeGroupIdPlaceholder')}
                      value={formData.group_id === 0 ? '0' : String(formData.group_id)}
                      onChange={(e) => handleInputChange('group_id', e.target.value === '' ? 0 : e.target.value)}
                      className="bg-white text-black text-base lg:text-lg h-10 lg:h-11"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2 lg:col-span-1">
                    <Label htmlFor="robot_list_str" className="text-white text-base lg:text-lg">
                      {t('settings.routeRobotListLabel')}
                    </Label>
                    <Input
                      id="robot_list_str"
                      type="text"
                      placeholder={t('settings.routeRobotListPlaceholder')}
                      value={formData.robot_list_str}
                      onChange={(e) => handleInputChange('robot_list_str', e.target.value)}
                      className="bg-white text-black text-base lg:text-lg h-10 lg:h-11"
                    />
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
                    className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-base h-10 lg:h-11"
                  >
                    {t('settings.cancel')}
                  </Button>
                  <Button
                    onClick={handleAddRoute}
                    disabled={isSubmitting}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-base h-10 lg:h-11"
                  >
                    <Plus className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
                    {t('settings.add')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nút thêm mới */}
          {!showAddForm && (
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white text-base lg:text-lg h-10 lg:h-11 px-4"
              >
                <Plus className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
                {t('settings.addNewRoute')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RouteSettings;