
import StatisticsOverviewCard from "@/components/Overview/statistics/StatisticsOverviewCard"
import GraphChart from "@/components/Overview/statistics/Graph_Chart"
import ColumnChart from "@/components/Overview/statistics/ColumnChart"
import RobotTable from "@/components/Overview/statistics/RobotTable"
import LineChart from "@/components/Overview/statistics/LineChart"
import SpeedChart from "@/components/Overview/statistics/SpeedChart"
import '@/styles/glowing.css';
import '@/styles/box_shadow_purple.css';

/** Lưới 6 ô: 3 cột x 2 hàng. Responsive: laptop (lg), desktop (xl), Full HD 1920 (fullhd). TV setup riêng sau. */
const GRID_CELL_CLASS =
  "min-h-0 flex flex-col overflow-hidden rounded-xl";

export default function Dashboard() {
  return (
    <div className="p-2 lg:p-3 xl:p-4 fullhd:p-4 min-w-0 w-full max-w-full overflow-x-hidden">
      <div
        className={[
          "grid gap-2 lg:gap-3 xl:gap-4 fullhd:gap-4",
          "min-h-[360px] lg:min-h-[440px] xl:min-h-[560px] fullhd:min-h-[720px]",
          "h-[calc(100vh-7rem)] lg:h-[calc(100vh-6.5rem)] xl:h-[calc(100vh-6rem)] fullhd:h-[calc(100vh-6rem)]",
          "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[1fr_1fr]",
          "min-w-0 w-full max-w-full",
        ].join(" ")}
      >
        {/* Hàng 1 */}
        <div className={GRID_CELL_CLASS}>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl">
            <StatisticsOverviewCard />
          </div>
        </div>
        <div className={GRID_CELL_CLASS}>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-lg shadow-sm">
            <ColumnChart />
          </div>
        </div>
        <div className={GRID_CELL_CLASS}>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden card-purple rounded-xl">
            <RobotTable />
          </div>
        </div>

        {/* Hàng 2 */}
        <div className={GRID_CELL_CLASS}>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden card-purple rounded-xl">
            <GraphChart />
          </div>
        </div>
        <div className={GRID_CELL_CLASS}>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <LineChart />
          </div>
        </div>
        <div className={GRID_CELL_CLASS}>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden card-purple rounded-xl">
            <SpeedChart />
          </div>
        </div>
      </div>
    </div>
  );
}