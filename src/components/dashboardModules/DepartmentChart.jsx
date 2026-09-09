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
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">No department data available</div>
      </div>
    );
  }

  return (
    <div className="h-64 flex items-stretch gap-0">
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-4 pr-4 sm:pr-6">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-start gap-2.5">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
              <span className="text-sm text-gray-500 leading-snug break-words">
                {entry.name}
              </span>
              <span className="text-sm font-semibold text-gray-800 tabular-nums shrink-0">
                {entry.percent}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="w-px self-stretch bg-gray-200 shrink-0" aria-hidden />

      <div className="flex-1 min-w-0 flex items-center justify-center pl-2 sm:pl-4">
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
              formatter={(value, name) => [`${value}`, name]}
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
