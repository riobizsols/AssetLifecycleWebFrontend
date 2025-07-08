import React from "react";

const AssetTypeChart = () => {
  const assetTypes = [
    { name: "Laptop", count: 67, color: "bg-blue-500" },
    { name: "Furniture", count: 45, color: "bg-blue-400" },
    { name: "Software", count: 27, color: "bg-blue-300" },
    { name: "Software", count: 10, color: "bg-blue-200" },
  ];

  const maxCount = Math.max(...assetTypes.map((item) => item.count));

  return (
    <div className="space-y-4">
      {assetTypes.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 w-20">
            {item.name}
          </span>
          <div className="flex-1 mx-4">
            <div className="bg-gray-200 rounded-full h-6 relative overflow-hidden">
              <div
                className={`${item.color} h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2`}
                style={{ width: `${(item.count / maxCount) * 100}%` }}
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
