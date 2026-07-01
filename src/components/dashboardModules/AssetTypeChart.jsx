import React from "react";
import { useDashboardStore } from "../../store/useDashboardStore";

const AssetTypeChart = () => {
  const assetTypes = useDashboardStore((s) => s.top5AssetTypes);
  const loading = useDashboardStore((s) => s.top5Loading);

  if (loading && assetTypes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center text-gray-500 py-8">Loading...</div>
      </div>
    );
  }

  if (!assetTypes || assetTypes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center text-gray-500 py-8">No asset types available</div>
      </div>
    );
  }

  const maxCount = Math.max(...assetTypes.map((item) => item.count));

  return (
    <div className="space-y-4">
      {assetTypes.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 w-28 truncate" title={item.name}>
            {item.name}
          </span>
          <div className="flex-1 mx-4 max-w-md">
            <div className="bg-gray-200 rounded-full h-6 relative overflow-hidden">
              <div
                className={`${item.color} h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2`}
                style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
              >
                <span className="text-white text-xs font-medium">
                  {item.count}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AssetTypeChart;
