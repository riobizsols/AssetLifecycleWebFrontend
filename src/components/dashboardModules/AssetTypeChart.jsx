import React, { useState, useEffect } from "react";
import API from "../../lib/axios";

// Color palette for asset types (blue shades)
const COLORS = [
  "bg-blue-500",
  "bg-blue-400",
  "bg-blue-300",
  "bg-blue-200",
  "bg-blue-100",
];

const AssetTypeChart = () => {
  const [assetTypes, setAssetTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTop5AssetTypes = async () => {
      try {
        setLoading(true);
        const response = await API.get("/assets/top-5-asset-types");
        
        if (response.data.success && response.data.data) {
          // Map API data to chart format with colors
          const chartData = response.data.data.map((type, index) => ({
            name: type.name,
            count: type.count,
            color: COLORS[index % COLORS.length],
          }));
          setAssetTypes(chartData);
        } else {
          setAssetTypes([]);
        }
      } catch (err) {
        console.error("Error fetching top 5 asset types:", err);
        setError("Failed to load asset types");
        setAssetTypes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTop5AssetTypes();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center text-gray-500 py-8">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-center text-red-500 py-8">{error}</div>
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
