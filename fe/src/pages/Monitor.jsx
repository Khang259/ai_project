import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Monitor } from 'lucide-react';
import { Table } from 'antd';
import useMonitor from '../hooks/Setting/useMonitor';
import useMonitorWS from '../components/Settings/useMonitorWS';

const MonitorPage = () => {
  const { data, fetchData } = useMonitor();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useMonitorWS(() => {
    fetchData(); // mỗi lần có message thì refetch
  });
  
  const columns = [
    { title: 'Tên sản phẩm', dataIndex: 'product_name', key: 'product_name', align: 'center' },
    {
      title: 'Kế hoạch',
      key: 'plan',
      align: 'center',
      render: (_, record) => {
        const value =
          record.status === 'in_progress'
            ? `${record.produced_quantity}/${record.target_quantity}`
            : record.target_quantity;
        return <span className="align-middle">{value}</span>;
      },
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

  // Status colors for progress segments
  const getStatusColor = (status) => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'in_progress') return 'bg-yellow-400';
    return 'bg-gray-300';
  };

  return (
    <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-4 text-[3rem] font-bold text-slate-800 mb-4">
            <span className="text-[4rem] font-extrabold uppercase italic tracking-widest drop-shadow-lg skew-y-1 -rotate-1">
              {"Monitor".split("").map((ch, idx) => {
                const rainbow = ["#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982"];
                const color = rainbow[idx % rainbow.length];
                return (
                  <span key={idx} style={{ color }} className="inline-block">
                    {ch}
                  </span>
                );
              })}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* ========== BARS WRAPPER ========== */}
          <div className="rounded-xl p-[3px] bg-gradient-to-r from-sky-400 via-purple-500 to-pink-500 shadow-lg mb-12 shadow-fuchsia-700">
            <div className="rounded-lg bg-white p-4">
              {/* ========== FRAME SECTION ========== */}
              <div className="mb-8">
                <h4 className="text-2xl font-semibold mb-3 text-sky-600">
                  Frame
                </h4>
                <div className="flex gap-1 h-10 rounded-lg overflow-hidden shadow-inner bg-gradient-to-r from-slate-100 to-slate-300">
                  {frameRows.map((item, index) => (
                    <div
                      key={item.key || index}
                      className={`${getStatusColor(
                        item.status
                      )} flex-1 relative flex items-center justify-center text-black font-semibold text-lg transition-all hover:scale-[1.02]`}
                      title={`${item.product_name} - ${item.status}`}
                    >
                      {item.product_name}
                    </div>
                  ))}
                </div>
              </div>

              {/* ========== TANK SECTION ========== */}
              <div className="mb-2">
                <h4 className="text-2xl font-semibold mb-3 text-emerald-600">
                  Tank
                </h4>
                <div className="flex gap-1 h-10 rounded-lg overflow-hidden shadow-inner bg-gradient-to-r from-slate-100 to-slate-300">
                  {tankRows.map((item, index) => (
                    <div
                      key={item.key || index}
                      className={`${getStatusColor(
                        item.status
                      )} flex-1 relative flex items-center justify-center text-black font-semibold text-lg transition-all hover:scale-[1.02]`}
                      title={`${item.product_name} - ${item.status}`}
                    >
                      {item.product_name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ========== TABLES SECTION ========== */}
          <div className="flex flex-wrap gap-8">
            {/* FRAME TABLE */}
            <div className="flex-1 min-w-[400px] bg-white rounded-xl border border-slate-300 p-4 shadow-md ">
              <h5 className="text-5xl font-semibold mb-3 text-center text-sky-600">Model Frame</h5>
              <Table
                size="large"
                bordered
                columns={columns}
                dataSource={frameRows.filter((x) => x.status !== 'completed')}
                pagination={false}
                showHeader={false}
                className="rounded-lg"
                rowClassName={(record) =>
                  record.status === 'in_progress'
                    ? 'bg-yellow-300 text-7xl font-bold'
                    : 'text-2xl'
                }
              />
            </div>

            {/* TANK TABLE */}
            <div className="flex-1 min-w-[400px] bg-white rounded-xl border border-slate-300 p-4 shadow-md">
              <h5 className="text-5xl font-semibold mb-3 text-center text-emerald-600">Model Tank</h5>
              <Table
                size="large"
                bordered
                columns={columns}
                dataSource={tankRows.filter((x) => x.status !== 'completed')}
                pagination={false}
                showHeader={false}
                className="rounded-lg"
                rowClassName={(record) =>
                  record.status === 'in_progress'
                    ? 'bg-yellow-300 text-7xl font-bold'
                    : 'text-2xl'
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
  );
};

export default MonitorPage;
