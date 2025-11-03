import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Monitor } from 'lucide-react';
import { Table } from 'antd';

const MonitorPage = () => {
  const modelColumns = [
    { title: 'STT', dataIndex: 'order', key: 'order', width: 100, align: 'center' },
    { title: 'Tên Model', dataIndex: 'modelName', key: 'modelName' },
    { title: 'Yêu cầu', dataIndex: 'required', key: 'required', width: 120, align: 'center' },
    { title: 'Đã cấp', dataIndex: 'supplied', key: 'supplied', width: 120, align: 'center' },
  ];

  const tankColumns = [
    { title: 'STT', dataIndex: 'order', key: 'order', width: 100, align: 'center' },
    { title: 'Tên Tank', dataIndex: 'tankName', key: 'tankName' },
    { title: 'Yêu cầu', dataIndex: 'required', key: 'required', width: 120, align: 'center' },
    { title: 'Đã cấp', dataIndex: 'supplied', key: 'supplied', width: 120, align: 'center' },
  ];

  const dataModel = [
    { key: 'm1', order: 1, status: 'active', modelName: 'M-A001', required: 150, supplied: 25 },
    { key: 'm2', order: 2, status: 'pending', modelName: 'M-A007', required: 200, supplied: 0 },
    { key: 'm3', order: 3, status: 'pending', modelName: 'M-B003', required: 50, supplied: 0 },
  ];

  const tankFrame = [
    { key: 't1', order: 1, status: 'completed', tankName: 'TANK-01', required: '500L', supplied: '500L' },
    { key: 't2', order: 2, status: 'active', tankName: 'TANK-02', required: '300L', supplied: 100 },
    { key: 't3', order: 3, status: 'pending', tankName: 'TANK-01', required: '150L', supplied: 0 },
    { key: 't4', order: 4, status: 'pending', tankName: 'TANK-03', required: '200L', supplied: 0 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-5 mb-2 text-6xl">
          <Monitor className="h-7 w-7 text-primary" />
          Monitor Sản Xuất
        </CardTitle>
        <CardDescription className="text-xl">
          Màn hình hiển thị kế hoạch sản xuất — chỉ xem
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Horizontal Segmented Bar (Likert-style, uses dataFrame) */}
        <div className="mb-6">
          {(() => {
            const total = Math.max(1, dataModel.length);
            const idx = dataModel.findIndex((i) => i.status === 'active');
            const activeIndex = idx === -1 ? 0 : idx;

            return (
              <div className="w-full">
                {/* Labels above each segment */}
                <div className="mb-2 grid" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
                  {dataModel.map((item, i) => (
                    <div key={item.key || i} className="text-center text-slate-700 text-base font-medium">
                      {item.modelName}
                    </div>
                  ))}
                </div>

                {/* Segmented bar */}
                <div className="flex w-full h-4 rounded-full overflow-hidden">
                  {dataModel.map((_, i) => (
                    <div
                      key={i}
                      className={`h-full ${i <= activeIndex ? 'bg-green-500' : 'bg-slate-300'}`}
                      style={{
                        width: `${100 / total}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Horizontal Segmented Bar (Likert-style, uses tankFrame) */}
        <div className="mb-6">
          {(() => {
            const total = Math.max(1, tankFrame.length);
            const idx = tankFrame.findIndex((i) => i.status === 'active');
            const activeIndex = idx === -1 ? 0 : idx;

            return (
              <div className="w-full">
                {/* Labels above each segment */}
                <div className="mb-2 grid" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
                  {tankFrame.map((item, i) => (
                    <div key={item.key || i} className="text-center text-slate-700 text-base font-medium">
                      {item.tankName}
                    </div>
                  ))}
                </div>

                {/* Segmented bar */}
                <div className="flex w-full h-4 rounded-full overflow-hidden">
                  {tankFrame.map((_, i) => (
                    <div
                      key={i}
                      className={`h-full ${i <= activeIndex ? 'bg-green-500' : 'bg-slate-300'}`}
                      style={{
                        width: `${100 / total}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Two tables side-by-side */}
        <div className="mt-15 flex gap-6">
          {/* Models Table */}
          <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3 text-2xl">
            <Table
              size="large"
              bordered
              columns={modelColumns}
              dataSource={dataModel}
              pagination={false}
              rowClassName={(record) =>
                record.status === 'active' ? 'text-5xl bg-green-500' : 'text-5xl'
              }
              onHeaderRow={() => ({ className: 'text-3xl' })}
            />
          </div>

          {/* Tanks Table */}
          <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3 text-2xl">
            <Table
              size="large"
              bordered
              columns={tankColumns}
              dataSource={tankFrame}
              pagination={false}
              rowClassName={(record) =>
                record.status === 'active' ? 'text-5xl bg-green-500' : 'text-5xl'
              }
              onHeaderRow={() => ({ className: 'text-3xl' })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonitorPage;


