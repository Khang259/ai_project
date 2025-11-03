import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Monitor } from 'lucide-react';
import { Table, Button, Space } from 'antd';


const MonitorSettings = () => {
  const columns = [
    {
      title: 'STT',
      dataIndex: 'index',
      key: 'index',
      width: 50,
      align: 'center',
    },
    {
      title: 'Tên Model',
      dataIndex: 'modelName',
      key: 'modelName',
    },
    {
      title: 'Số lượng ',
      dataIndex: 'modelQty',
      key: 'modelQty',
      width: 80,
      align: 'center',
    },
    {
      title: 'Hành động',
      key: 'modelActions',
      width: 120,
      render: () => (
        <Space size="small">
          <Button type="link" size="small" style={{ border: '1px solid #3b82f6' }}>Sửa</Button>
          <Button type="link" size="small" danger style={{ border: '1px solid #ef4444' }}>Xóa</Button>
        </Space>
      ),
    },
    {
      title: 'Tên Tank',
      dataIndex: 'tankName',
      key: 'tankName',
      className: 'border-l-4 border-slate-200 pl-4',
    },
    {
      title: 'Số lượng',
      dataIndex: 'tankQty',
      key: 'tankQty',
      width: 80,
      align: 'center',
      className: 'border-l-4 border-transparent',
    },
    {
      title: 'Hành động',
      key: 'tankActions',
      width: 120,
      render: () => (
        <Space size="small">
          <Button type="link" size="small" style={{ border: '1px solid #3b82f6' }}>Sửa</Button>
          <Button type="link" size="small" danger style={{ border: '1px solid #ef4444' }}>Xóa</Button>
        </Space>
      ),
      className: 'border-l-4 border-transparent',
    },
  ];

  const dataSource = [
    {
      key: '1',
      index: 1,
      modelName: 'VL-111',
      modelQty: 120,
      tankName: 'Tank A',
      tankQty: 300,
    },
    {
      key: '2',
      index: 2,
      modelName: 'VL-222',
      modelQty: 80,
      tankName: 'Tank B',
      tankQty: 240,
    },
    {
      key: '3',
      index: 3,
      modelName: 'VL-333',
      modelQty: 150,
      tankName: 'Tank C',
      tankQty: 120,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-5 mb-2">
          <Monitor className="h-5 w-5 text-primary" />
          Cấu hình Monitor
        </CardTitle>
        <CardDescription>
          Đặt model và số lượng trên monitor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2 mb-7 mt-7">
          <Button type="primary">+ Thêm Model/Tank</Button>
          <Button>Nhập Excel</Button>
          <Button>Xuất Excel</Button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <Table
            size="middle"
            bordered
            columns={columns}
            dataSource={dataSource}
            pagination={false}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default MonitorSettings;