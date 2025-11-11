import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Monitor } from 'lucide-react';
import { Table } from 'antd';
import useMonitor from '../hooks/Setting/useMonitor';

const MonitorPage = () => {
  const { data, fetchData } = useMonitor();

  useEffect(() => {
    fetchData(); 
  }, [fetchData]);

  const columns = [
    { title: 'Tên sản phẩm', dataIndex: 'product_name', key: 'product_name', align: 'center' },  
    { 
      title: 'Kế hoạch', 
      key: 'plan', 
      align: 'center',
      render: (_, record) => {
        const value = record.status === 'in_progress' 
          ? `${record.produced_quantity}/${record.target_quantity}`
          : record.target_quantity;
        return <span className="align-middle">{value}</span>;
      }
    },
  ];

  const frameRows = useMemo(() =>
    (data || []).filter(x => x.category_name === 'frame').map((x, i) => ({
      key: x.id || i,
      product_name: x.product_name,
      produced_quantity: Number(x.produced_quantity ?? 0),
      target_quantity: Number(x.target_quantity ?? 0),
      status: x.status,
    })), [data]
  );

  const tankRows = useMemo(() =>
    (data || []).filter(x => x.category_name === 'tank').map((x, i) => ({
      key: x.id || i,
      product_name: x.product_name,
      produced_quantity: Number(x.produced_quantity ?? 0),
      target_quantity: Number(x.target_quantity ?? 0),
      status: x.status,
    })), [data]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-6 mb-2 text-[4rem] justify-center">
          <Monitor className="h-12 w-12 text-primary" />
          Monitor Sản Xuất
        </CardTitle>
      </CardHeader>
      <CardContent>
      <div className="mb-6">
        
        {/* Frame Progress Bar */}
        <div className="mb-4">
          <h4 className="text-xl mb-2 font-semibold">Frame</h4>
          <div className="flex gap-0.5 h-8 rounded-lg ">
            {frameRows.map((item, index) => {
              let bgColor = 'bg-red-500'; // pending
              if (item.status === 'completed') bgColor = 'bg-green-500';
              else if (item.status === 'in_progress') bgColor = 'bg-yellow-500';
              
              return (
               
                <div
                  key={item.key || index}
                  className={`${bgColor} flex-1 relative`}
                >
                  <div className='absolute top-10 w-full flex items-center justify-center' >
                    <span className={`text-2xl text-black`}>{item.product_name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tank Progress Bar */}
        <div className="mt-15 mb-10">
          <h4 className="text-xl mb-2 font-semibold mt-10">Tank</h4>
          <div className="flex gap-0.5 h-8 rounded-lg ">
            {tankRows.map((item, index) => {
              let bgColor = 'bg-red-500'; // pending
              if (item.status === 'completed') bgColor = 'bg-green-500';
              else if (item.status === 'in_progress') bgColor = 'bg-yellow-500';
              
              return (
                <div
                  key={item.key || index}
                  className={`${bgColor} flex-1 relative  `}
                  title={`${item.product_name} - ${item.status}`}
                >
                  <div className='absolute top-10 w-full flex items-center justify-center' >
                    <span className={`text-2xl text-black`}>{item.product_name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
        {/* Two tables side-by-side */}
        <div className="mt-15 flex gap-6">
          {/* Models Table */}
          <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3 text-2xl">
            <Table
              className="no-hover-table"
              size="large"
              bordered
              columns={columns}
              dataSource={frameRows.filter(x => x.status !== 'completed')}
              pagination={false}
              rowClassName={(record) => {
                let className = 'text-5xl';
                if (record.status === 'in_progress') className += ' bg-yellow-500 text-bold text-9xl ';
                return className;
              }}
              onHeaderRow={() => ({ className: 'text-3xl' })}
            />
          </div>

          {/* Tanks Table */}
          <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3 text-2xl">
            <Table
              size="large"
              bordered
              columns={columns}
              dataSource={tankRows.filter(x => x.status !== 'completed')}
              pagination={false}
              rowClassName={(record) => {
                let className = 'text-5xl';
                if (record.status === 'in_progress') className += ' bg-yellow-500 text-bold text-9xl ';
                return className;
              }}
              onHeaderRow={() => ({ className: 'text-3xl' })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonitorPage;


