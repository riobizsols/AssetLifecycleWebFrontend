import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useDashboardStore } from "../../store/useDashboardStore";

const DepartmentChart = () => {
  const data = useDashboardStore((s) => s.departmentChart);
  const loading = useDashboardStore((s) => s.departmentLoading);

  const chartData = useMemo(() => {
    const total = (data || []).reduce((sum, item) => sum + Number(item.value || 0), 0);
    return (data || []).map((item) => ({
      ...item,
      percent: total > 0 ? Math.round((Number(item.value || 0) / total) * 100) : 0,
    }));
  }, [data]);

  if (loading && data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center">
        <div className="text-gray-500">No department data available</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-4 min-h-[18rem]">
      {/* Legend: scrolls when many departments — avoids overlap */}
      <div className="sm:w-[48%] min-w-0 order-2 sm:order-1 flex flex-col">
        <div className="max-h-64 sm:max-h-72 overflow-y-auto pr-1 space-y-2">
          {chartData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2.5 min-h-[1.5rem]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden
              />
              <span
                className="flex-1 min-w-0 text-xs sm:text-sm text-gray-600 leading-tight truncate"
                title={entry.name}
              >
                {entry.name}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-gray-800 tabular-nums shrink-0">
                {entry.percent}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden sm:block w-px self-stretch bg-gray-200 shrink-0 order-none" aria-hidden />

      <div className="sm:w-[48%] min-w-0 order-1 sm:order-2 h-52 sm:h-64 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius="78%"
              fill="#8884d8"
              dataKey="value"
              stroke="#ffffff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} assets`, name]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DepartmentChart;
