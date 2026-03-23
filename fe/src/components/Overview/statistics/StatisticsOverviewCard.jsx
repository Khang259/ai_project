import StatisticsLeftSide from "./StatisticsLeftSide";
import SemiPieChartGroup from "./SemiPieChartGroup";

/**
 * Component gộp StatisticsLeftSide + SemiPieChartGroup trong 1 khung card
 */
export default function StatisticsOverviewCard() {
  return (
    <div className="card-purple p-2 lg:p-3 xl:p-4 laptop13:p-3 laptop13:pr-2 fullhd:p-4 fullhd:pr-2 tv:p-8 tv:pr-6 h-full flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <StatisticsLeftSide />
      </div>
      <div className="flex-1 min-h-0 flex flex-col mt-4 lg:mt-5 laptop13:mt-4 fullhd:mt-5 tv:mt-8 overflow-hidden">
        <SemiPieChartGroup variant="embedded" />
      </div>
    </div>
  );
}
