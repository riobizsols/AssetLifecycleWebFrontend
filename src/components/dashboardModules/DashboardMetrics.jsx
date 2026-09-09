import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../ui/card";

const formatMetricValue = (value) => {
  if (value === null || value === undefined || value === "") return "0";
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
    return numeric.toLocaleString("en-US");
  }
  return String(value);
};

const DashboardMetrics = ({ metrics, loading = false }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;
        return (
          <Card
            key={index}
            className={`${metric.color} text-white ${metric.path ? "cursor-pointer" : ""} transition-all duration-200 hover:shadow-xl hover:scale-105 ${metric.hoverColor}`}
            onClick={() => metric.path && navigate(metric.path)}
          >
            <CardContent className="p-4 sm:p-6">
              <p className="text-white/80 text-sm font-medium leading-snug mb-3 break-words">
                {metric.title}
              </p>
              <div className="flex items-end justify-between gap-3">
                <p className="min-w-0 text-2xl sm:text-3xl xl:text-4xl font-bold tabular-nums leading-none tracking-tight truncate">
                  {loading ? (
                    <span className="text-white/60 animate-pulse">...</span>
                  ) : (
                    formatMetricValue(metric.value)
                  )}
                </p>
                <div className="bg-white/20 p-2 sm:p-3 rounded-lg shrink-0 w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center">
                  <IconComponent className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardMetrics;
