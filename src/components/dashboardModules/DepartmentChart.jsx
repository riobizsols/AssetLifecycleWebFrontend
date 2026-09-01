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

  const total = useMemo(
    () => data.reduce((sum, item) => sum + (item.value || 0), 0),
    [data],
  );

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
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-0 min-h-[18rem]">
      {/* Legend */}
      <div className="sm:w-[52%] min-w-0 sm:pr-5 sm:border-r border-gray-200 pb-4 sm:pb-0 border-b sm:border-b-0">
        <ul className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {data.map((item, index) => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <li
                key={`${item.name}-${index}`}
                className="flex items-start gap-2.5 text-sm leading-snug"
              >
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span
                  className="min-w-0 flex-1 break-words text-gray-700"
                  title={item.name}
                >
                  {item.name}
                </span>
                <span className="shrink-0 font-semibold text-gray-900 tabular-nums">
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Pie chart */}
      <div className="flex flex-1 items-center justify-center sm:pl-5 min-h-[12rem]">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius={0}
              outerRadius={88}
              paddingAngle={0}
              dataKey="value"
              stroke="#fff"
              strokeWidth={1}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, props) => [
                `${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
                props?.payload?.name || "Assets",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DepartmentChart;
