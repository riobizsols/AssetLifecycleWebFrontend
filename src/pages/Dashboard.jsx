import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Users,
  Wrench,
  Ban,
  PieChart,
  BarChart3,
  Bell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import DashboardMetrics from "../components/dashboardModules/DashboardMetrics";
import DepartmentChart from "../components/dashboardModules/DepartmentChart";
import AssetTypeChart from "../components/dashboardModules/AssetTypeChart";
import NotificationsPanel from "../components/dashboardModules/NotificationsPanel";
import CronJobMonitor from "../components/dashboardModules/CronJobMonitor";
import DashboardCronJobTrigger from "../components/DashboardCronJobTrigger";

const Dashboard = () => {
  const navigate = useNavigate();

  const metrics = [
    {
      title: "Total Assets",
      value: "227",
      icon: Package,
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
      path: "/assets",
    },
    {
      title: "Assigned Assets",
      value: "227",
      icon: Users,
      color: "bg-sky-500",
      hoverColor: "hover:bg-sky-600",
      path: "/assigned-assets",
    },
    {
      title: "Under Maintenance",
      value: "227",
      icon: Wrench,
      color: "bg-cyan-500",
      hoverColor: "hover:bg-cyan-600",
      path: "/maintenance",
    },
    {
      title: "Decommissioned",
      value: "227",
      icon: Ban,
      color: "bg-yellow-500",
      hoverColor: "hover:bg-yellow-600",
      path: "/decommissioned",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Removed Dashboard heading section */}

        <DashboardMetrics metrics={metrics} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card onClick={() => navigate("/department-distribution")}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Department Wise Asset Distribution
              </CardTitle>
              <PieChart className="w-5 h-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <DepartmentChart />
            </CardContent>
          </Card>

          <Card onClick={() => navigate("/asset-types")}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Top 5 Asset Type
              </CardTitle>
              <BarChart3 className="w-5 h-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <AssetTypeChart />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card onClick={() => navigate("/department-details")}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Department Wise Asset Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500">
                Detailed breakdown coming soon...
              </p>
            </CardContent>
          </Card>

          <Card onClick={() => navigate("/notifications")}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Notifications & Alerts
              </CardTitle>
              <Bell className="w-5 h-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <NotificationsPanel />
            </CardContent>
          </Card>
        </div>

        {/* Cron Job Monitor - Added for maintenance schedule generation */}
        <div className="grid grid-cols-1 gap-6">
          <CronJobMonitor />
        </div>

        {/* Depreciation Cron Job Trigger */}
        <div className="grid grid-cols-1 gap-6">
          <DashboardCronJobTrigger />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
