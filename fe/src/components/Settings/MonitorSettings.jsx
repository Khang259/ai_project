import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Monitor } from 'lucide-react';
import { Table, Button, Space } from 'antd';
import useMonitor from '../../hooks/Setting/useMonitor';
import ExcelJS from 'exceljs';
import { message } from 'antd';
import useMonitorWS from './useMonitorWS';

const MonitorSettings = () => {
  const { data, fetchData, saveDailyPlan } = useMonitor();

  useEffect(() => {
    fetchData(); // mặc định hôm nay
  }, [fetchData]);

  useMonitorWS(() => {
    fetchData(); // mỗi lần có message thì refetch
  });

  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return; 
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    // Lấy sheet đầu tiên
    const sheet = workbook.worksheets[0];
    const jsonData = [];
    
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const header = sheet.getRow(1).getCell(colNumber).value;
        rowData[header] = cell.value;
      });
      jsonData.push(rowData);
    });
    

    let indexFrame = 1;
    let indexTank = 1;
    data.forEach((item) => {
      if (item.category_name === "frame" && item.status === "completed") {
        indexFrame++;
      }
      if (item.category_name === "tank" && item.status === "completed") {
        indexTank++;
      }
    });
    const transformedData = [];
    jsonData.forEach((row) => {
      if (row["Name Frame"]) {
        transformedData.push({
          category_name: "frame",
          product_name: row["Name Frame"],
          target_quantity: row["Quantity Frame"],
          production_order: indexFrame ++
        });
      }
      if (row["Name Tank"]) {  
        transformedData.push({
          category_name: "tank",
          product_name: row["Name Tank"],
          target_quantity: row["Quantity Tank"],
          production_order: indexTank ++
        });
      }
    });
    saveDailyPlan(transformedData);
    message.success('Nhập Excel thành công');

    e.target.value = '';
  };

  const handleExcelExport = async () => {
    let dataExcel = [];
    if (frameRows.length === 0 || tankRows.length === 0) {
      dataExcel = [
        { "Name Frame": "Frame 1", "Quantity Frame": 2, "Name Tank": "Tank 1", "Quantity Tank": 2 },
      ];
    } else {
      const maxLen = Math.max(frameRows.length, tankRows.length);
      dataExcel = Array.from({ length: maxLen }, (_, i) => ({
        "Name Frame": frameRows[i]?.product_name || "",
        "Quantity Frame": frameRows[i]?.target_quantity ?? "",
        "Name Tank": tankRows[i]?.product_name || "",
        "Quantity Tank": tankRows[i]?.target_quantity ?? "",
      }));
    }
    console.log('📄 Data Excel:', dataExcel);

    // Tạo workbook
    const wb = new ExcelJS.Workbook();

    // Sheet "Model Data"
    const wsModel = wb.addWorksheet('Model Data');
    wsModel.columns = [
      { header: 'Name Frame', key: 'Name Frame', width: 30 },
      { header: 'Quantity Frame', key: 'Quantity Frame', width: 15 },
      { header: 'Name Tank', key: 'Name Tank', width: 30 },
      { header: 'Quantity Tank', key: 'Quantity Tank', width: 15 },
    ];

    // Thêm dữ liệu
    dataExcel.forEach(item => {
      wsModel.addRow(item);
    });

    // Sheet "List"
    const listNames = ["K0R", "K2P", "K1Y", "K1W", "K2C", "K45", "K46"];
    const wsList = wb.addWorksheet('List');
    wsList.columns = [{ header: 'Name', key: 'Name', width: 15 }];
    listNames.forEach(name => {
      wsList.addRow({ Name: name });
    });

    // Data Validation cho cột A và C
    const lastRow = 100;
    const listFormula = `List!$A$2:$A$25`;

    for (let i = 2; i <= lastRow; i++) {
      wsModel.getCell(`A${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [listFormula]
      };
      wsModel.getCell(`C${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [listFormula]
      };
    }

    console.log('📄 wsModel:', wsModel);

    // Xuất file
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Monitor.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { title: 'Tên sản phẩm', dataIndex: 'product_name', key: 'product_name' },
    { title: 'Đã cấp', dataIndex: 'produced_quantity', key: 'produced_quantity', align: 'center', width: 120 },
    { title: 'Kế hoạch', dataIndex: 'target_quantity', key: 'target_quantity', align: 'center', width: 120 },
    { 
      title: 'Kết quả', 
      dataIndex: 'status', 
      key: 'status', 
      align: 'center', 
      width: 100, 
      render: (v) => {
        if (v === 'completed') return 'Xong';
        if (v === 'in_progress') return 'Đang làm';
        return 'Chờ';
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
    <Card className="min-w-0 border-2 glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 mb-2 text-xl lg:text-2xl text-white">
          <Monitor className="h-6 w-6 lg:h-7 lg:w-7 text-primary" />
          Cấu hình Monitor
        </CardTitle>
        <CardDescription className="text-sm lg:text-base text-white/90">
          Đặt model và số lượng trên monitor
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2 mt-4">
          <Button
            onClick={() => document.getElementById('monitor-excel-import')?.click()}
            className="text-sm lg:text-base h-10 lg:h-11 px-4"
          >
            Nhập Excel
          </Button>
          <Button
            className="bg-primary text-white text-sm lg:text-base h-10 lg:h-11 px-4"
            onClick={handleExcelExport}
          >
            Xuất Excel
          </Button>
          <input
            id="monitor-excel-import"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleExcelImport}
          />
        </div>

        <div className="mt-4 flex flex-col lg:flex-row gap-4 min-w-0">
          <div className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white p-3 lg:p-4 overflow-hidden">
            <div className="text-lg lg:text-xl font-semibold mb-2 text-gray-800">Frame</div>
            <div className="min-w-0 overflow-x-auto">
              <Table
                size="middle"
                bordered
                columns={columns}
                dataSource={frameRows}
                pagination={false}
                className="settings-monitor-table [&_.ant-table]:text-sm [&_.ant-table]:lg:text-base"
                rowClassName={(record) => {
                  if (record.status === 'completed') return 'bg-green-500/20';
                  if (record.status === 'in_progress') return 'bg-yellow-500/20';
                  return '';
                }}
              />
            </div>
          </div>
          <div className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white p-3 lg:p-4 overflow-hidden">
            <div className="text-lg lg:text-xl font-semibold mb-2 text-gray-800">Tank</div>
            <div className="min-w-0 overflow-x-auto">
              <Table
                size="middle"
                bordered
                columns={columns}
                dataSource={tankRows}
                pagination={false}
                className="settings-monitor-table [&_.ant-table]:text-sm [&_.ant-table]:lg:text-base"
                rowClassName={(record) => {
                  if (record.status === 'completed') return 'bg-green-500/20';
                  if (record.status === 'in_progress') return 'bg-yellow-500/20';
                  return '';
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonitorSettings;