
import AMRWarehouseMap from "@/components/Overview/map/AMRWarehouseMap/AMRWarehouseMap"
import StatisticsLeftSide from "@/components/Overview/statistics/StatisticsLeftSide"
import GraphChart from "@/components/Overview/statistics/Graph_Chart"
import SemiPieChart from "@/components/Overview/statistics/SemiPieChart"
import ColumnChart from "@/components/Overview/statistics/ColumnChart"
import RobotTable from "@/components/Overview/statistics/RobotTable"
import LineChart from "@/components/Overview/statistics/LineChart"
import '@/styles/glowing.css';
import '@/styles/box_shadow_purple.css';

export default function Dashboard() {
  return (
    <div className="col-3">
      <div className="flex flex-row justify-between">
        {/* Cols-1 */}
        <div className="row-3 w-1/3 mt-4">
          <div className="card-purple">
              <StatisticsLeftSide />
          </div>
          <div className="grid grid-cols-2 mb-4 mt-4">
            <div className="card-purple-specific">
              <span className="text-white font-medium mb-2 pr-30">7 ngày gần nhất</span>
              <div className="" 
              style={{
                borderRadius: '16px',
              }}>
                <SemiPieChart />
              </div>
            </div>
            <div className="">
              <div className="card-purple-specific">
                <span className="text-white font-medium mb-2 pr-30">30 ngày gần nhất</span>
                <div className="" 
                  style={{
                    borderRadius: '16px',
                  }}>
                  <SemiPieChart />
                </div>
              </div>
            </div>
          </div>
          <div className="">
              <GraphChart />
          </div>
        </div>
        {/* Cols-2 */}
        <div className="row-2">
          <div className="">
            <div className="rounded-lg shadow-sm">
              <AMRWarehouseMap />
            </div>
          </div>
          <div>
            {/* Task Completion Rate */}
          </div>
          <div className="m-4 mt-8">
            {/* line Chart */}
            <LineChart />
          </div>
        </div>
      
        {/* Cols-3 */}
        <div className="w-1/3">
          <div className="row-2 mt-4 ml-4">
            <div className="card-purple">
              {/* Table List AMR */}
              <RobotTable />
            </div>
            <div className="card-purple mt-4">
              {/* Coulumn chart*/}
              <ColumnChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}