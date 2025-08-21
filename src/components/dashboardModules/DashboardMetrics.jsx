import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../ui/card";

const DashboardMetrics = ({ metrics }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;
        return (
          <Card
            key={index}
            className={`${metric.color} text-white cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 ${metric.hoverColor}`}
            onClick={() => navigate(metric.path)}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium mb-2">
                    {metric.title}
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold">{metric.value}</p>
                </div>
                <div className="bg-white/20 p-2 sm:p-3 rounded-lg">
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
