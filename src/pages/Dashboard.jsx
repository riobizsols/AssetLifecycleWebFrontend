import React, { lazy, Suspense, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Users,
  Wrench,
  Ban,
  PieChart,
  BarChart3,
  Bell,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import DashboardMetrics from "../components/dashboardModules/DashboardMetrics";
import DepartmentChart from "../components/dashboardModules/DepartmentChart";
import AssetTypeChart from "../components/dashboardModules/AssetTypeChart";
import NotificationsPanel from "../components/dashboardModules/NotificationsPanel";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuthStore } from "../store/useAuthStore";
import { useDashboardStore } from "../store/useDashboardStore";
import { useRevalidateOnFocus } from "../hooks/useRevalidateOnFocus";

const CronJobMonitor = lazy(() => import("../components/dashboardModules/CronJobMonitor"));
const DashboardCronJobTrigger = lazy(() => import("../components/DashboardCronJobTrigger"));
const DashboardInspectionTrigger = lazy(() => import("../components/DashboardInspectionTrigger"));
const DashboardMaintenanceTrigger = lazy(() => import("../components/DashboardMaintenanceTrigger"));
const DashboardWorkflowEscalationTrigger = lazy(() => import("../components/DashboardWorkflowEscalationTrigger"));

const SectionFallback = () => (
  <div className="h-24 flex items-center justify-center text-sm text-gray-400">Loading…</div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const empIntId = useAuthStore((s) => s.user?.emp_int_id);

  const metrics = useDashboardStore((s) => s.metrics);
  const metricsLoading = useDashboardStore((s) => s.metricsLoading);
  const loadDashboard = useDashboardStore((s) => s.loadDashboard);

  useEffect(() => {
    loadDashboard(empIntId);
  }, [empIntId, loadDashboard]);

  useRevalidateOnFocus(() => {
    loadDashboard(empIntId);
  });

  const metricCards = [
    {
      title: t('dashboard.totalAssets'),
      value: metrics.totalAssets,
      icon: Package,
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
    },
    {
      title: t('dashboard.assignedAssets'),
      value: metrics.assignedAssets,
      icon: Users,
      color: "bg-sky-500",
      hoverColor: "hover:bg-sky-600",
    },
    {
      title: t('dashboard.underMaintenance'),
      value: metrics.underMaintenance,
      icon: Wrench,
      color: "bg-cyan-500",
      hoverColor: "hover:bg-cyan-600",
    },
    {
      title: t('dashboard.decommissioned'),
      value: metrics.decommissioned,
      icon: Ban,
      color: "bg-yellow-500",
      hoverColor: "hover:bg-yellow-600",
    },
  ];

  const summary = metrics.summary;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="w-full max-w-none xl:max-w-7xl 2xl:max-w-none mx-auto space-y-4 sm:space-y-6">
        <DashboardMetrics metrics={metricCards} loading={metricsLoading && metrics.totalAssets === 0 && !metrics.summary} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {t('dashboard.departmentWiseDistribution')}
              </CardTitle>
              <PieChart className="w-5 h-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <DepartmentChart />
            </CardContent>
          </Card>

          <Card onClick={() => navigate("/master-data/asset-types")}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {t('dashboard.topAssetTypes')}
              </CardTitle>
              <BarChart3 className="w-5 h-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <AssetTypeChart />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {summary && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Info className="w-5 h-5 text-blue-600" />
                  <span>{t('dashboard.assetBreakdown') || 'Asset Breakdown & Overlaps'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {summary.overlaps && (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        {t('dashboard.overlaps') || 'Overlaps (Assets in Multiple Categories)'}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {summary.overlaps.assigned_and_maintenance > 0 && (
                          <div className="bg-blue-50 rounded p-2">
                            <p className="text-xs text-gray-600">{t('dashboard.assignedAndMaintenance') || 'Assigned + Maintenance'}</p>
                            <p className="text-lg font-bold text-blue-700">{summary.overlaps.assigned_and_maintenance}</p>
                          </div>
                        )}
                        {summary.overlaps.assigned_and_decommissioned > 0 && (
                          <div className="bg-yellow-50 rounded p-2">
                            <p className="text-xs text-gray-600">{t('dashboard.assignedAndDecommissioned') || 'Assigned + Decommissioned'}</p>
                            <p className="text-lg font-bold text-yellow-700">{summary.overlaps.assigned_and_decommissioned}</p>
                          </div>
                        )}
                        {summary.overlaps.maintenance_and_decommissioned > 0 && (
                          <div className="bg-orange-50 rounded p-2">
                            <p className="text-xs text-gray-600">{t('dashboard.maintenanceAndDecommissioned') || 'Maintenance + Decommissioned'}</p>
                            <p className="text-lg font-bold text-orange-700">{summary.overlaps.maintenance_and_decommissioned}</p>
                          </div>
                        )}
                        {summary.overlaps.all_three > 0 && (
                          <div className="bg-red-50 rounded p-2">
                            <p className="text-xs text-gray-600">{t('dashboard.allThree') || 'All Three Categories'}</p>
                            <p className="text-lg font-bold text-red-700">{summary.overlaps.all_three}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {summary.none > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-600">
                        {t('dashboard.assetsNotInCategories') || 'Assets not in any category'}: 
                        <span className="font-bold text-gray-800 ml-2">{summary.none}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('dashboard.breakdownNote') || 'These assets are unassigned, not under maintenance, and not decommissioned.'}
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          <Card onClick={() => navigate("/notifications")}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {t('dashboard.notifications')}
              </CardTitle>
              <Bell className="w-5 h-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <NotificationsPanel />
            </CardContent>
          </Card>
        </div>

        <Suspense fallback={<SectionFallback />}>
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <CronJobMonitor deferMs={800} />
          </div>
        </Suspense>

        <Suspense fallback={null}>
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <DashboardCronJobTrigger />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <DashboardInspectionTrigger />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <DashboardMaintenanceTrigger />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <DashboardWorkflowEscalationTrigger />
          </div>
        </Suspense>
      </div>
    </div>
  );
};

export default Dashboard;
