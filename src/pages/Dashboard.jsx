import React, { useState, useEffect } from "react";
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
import CronJobMonitor from "../components/dashboardModules/CronJobMonitor";
import DashboardCronJobTrigger from "../components/DashboardCronJobTrigger";
import DashboardInspectionTrigger from "../components/DashboardInspectionTrigger";
import DashboardMaintenanceTrigger from "../components/DashboardMaintenanceTrigger";
import DashboardWorkflowEscalationTrigger from "../components/DashboardWorkflowEscalationTrigger";
import { useLanguage } from "../contexts/LanguageContext";
import API from "../lib/axios";

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [totalAssets, setTotalAssets] = useState(0);
  const [assignedAssets, setAssignedAssets] = useState(0);
  const [underMaintenance, setUnderMaintenance] = useState(0);
  const [decommissioned, setDecommissioned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const fetchAllMetrics = async () => {
      setLoading(true);
      try {
        const [totalResponse, assignedResponse, maintenanceResponse, decommissionedResponse, summaryResponse] = 
          await Promise.all([
            API.get("/assets/count"),
            API.get("/assets/assigned"),
            API.get("/assets/under-maintenance"),
            API.get("/assets/decommissioned"),
            API.get("/assets/dashboard-summary").catch(() => ({ data: null })) // Optional, don't fail if it doesn't exist
          ]);
        
        setTotalAssets(totalResponse.data.count || 0);
        setAssignedAssets(assignedResponse.data.count || 0);
        setUnderMaintenance(maintenanceResponse.data.count || 0);
        setDecommissioned(decommissionedResponse.data.count || 0);
        
        if (summaryResponse?.data?.success) {
          setSummary(summaryResponse.data.summary);
        }
      } catch (error) {
        console.error("Error fetching dashboard metrics:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllMetrics();
  }, []); 

  const metrics = [
    {
      title: t('dashboard.totalAssets'),
      value: totalAssets,
      icon: Package,
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
      // path: "/assets",
    },
    {
      title: t('dashboard.assignedAssets'),
      value: assignedAssets,
      icon: Users,
      color: "bg-sky-500",
      hoverColor: "hover:bg-sky-600",
      // path: "/assigned-assets",
    },
    {
      title: t('dashboard.underMaintenance'),
      value: underMaintenance,
      icon: Wrench,
      color: "bg-cyan-500",
      hoverColor: "hover:bg-cyan-600",
      // path: "/maintenance",
    },
    {
      title: t('dashboard.decommissioned'),
      value: decommissioned,
      icon: Ban,
      color: "bg-yellow-500",
      hoverColor: "hover:bg-yellow-600",
      // path: "/decommissioned",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="w-full max-w-none xl:max-w-7xl 2xl:max-w-none mx-auto space-y-4 sm:space-y-6">
        {/* Removed Dashboard heading section */}

        <DashboardMetrics metrics={metrics} loading={loading} />

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

        {/* Cron Job Monitor - Added for maintenance schedule generation */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <CronJobMonitor />
        </div>

        {/* Depreciation Cron Job Trigger */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <DashboardCronJobTrigger />
        </div>

        {/* Inspection Trigger */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <DashboardInspectionTrigger />
        </div>

        {/* Maintenance Trigger */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <DashboardMaintenanceTrigger />
        </div>

        {/* Workflow Escalation Trigger */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <DashboardWorkflowEscalationTrigger />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
