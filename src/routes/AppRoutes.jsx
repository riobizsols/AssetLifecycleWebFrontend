import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Login from "../pages/auth/Login";
import Dashboard from "../pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../layouts/MainLayout";
import ForgotPassword from "../pages/auth/ForgetPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import Assets from "../pages/Assets";
import UserRoles from "../pages/masterData/UserRoles";
import AssignRoles from "../components/AssignRoles";
import Departments from "../pages/masterData/Departments";
import Branches from "../pages/masterData/Branches";
import AddBranch from "../components/AddBranch";
import DepartmentsAdmin from "../pages/masterData/DepartmentsAdmin";
import DepartmentsAsset from "../pages/masterData/DepartmentsAsset";
import Organization from "../pages/masterData/Organization";
import Vendors from "../pages/masterData/Vendors";
import AddEntityForm from "../components/AddEntityForm";
import ProdServ from "../pages/masterData/ProdServ";
import AddAssetForm from "../components/assets/AddAssetForm";
import AddAssetType from "../components/AddAssetType";
import AssetType from "../pages/AssetType";
import DepartmentWiseAssetAssignment from "../pages/DepartmentWiseAssetAssignment";
import EmployeeWiseAssetAssignment from "../pages/EmployeeWiseAssetAssignment";
import AssetSelection from "../components/assetAssignment/AssetSelection";
import AssetsDetail from "../components/assetAssignment/AssetsDetail";
import MaintenanceApproval from "../pages/MaintenanceApproval";
import NotificationsPanel from "../components/dashboardModules/NotificationsPanel";
import AllNotifications from "../components/AllNotifications";
import MaintenanceApprovalDetail from "../components/MaintenanceApprovalDetail";
import MaintenanceSupervisor from "../pages/MaintenanceSupervisor";
import CronJobManagement from "../pages/CronJobManagement";
import MaintSupervisorApproval from "../components/MaintSupervisorApproval";
import ReportsBreakdown from "../pages/ReportsBreakdown";
import BreakdownSelection from "../components/reportbreakdown/BreakdownSelection";
import BreakdownDetails from "../components/reportbreakdown/BreakdownDetails";
import EditBreakdownReport from "../components/reportbreakdown/EditBreakdownReport";
import AdminSettingsView from "../pages/AdminSettingsView";
import MaintenanceScheduleView from "../pages/MaintenanceScheduleView";
import AuditLogsView from "../pages/AuditLogsView";
import AuditLogConfig from "../components/AuditLogConfig";
import AuditLogConfigPage from "../pages/AuditLogConfigPage";
import InspectionView from "../pages/InspectionView";
import GroupAsset from "../pages/GroupAsset";
import CreateGroupAsset from "../components/groupAsset/CreateGroupAsset";
import EditGroupAsset from "../components/groupAsset/EditGroupAsset";
import ViewGroupAsset from "../components/groupAsset/ViewGroupAsset";
import ScrapSales from "../pages/ScrapSales";
import CreateScrapSales from "../components/scrapSales/CreateScrapSales";
import EditScrapSales from "../components/scrapSales/EditScrapSales";
import ViewScrapSales from "../components/scrapSales/ViewScrapSales";
import ScrapAssets from "../pages/ScrapAssets";

import NearingExpiry from "../components/scrapAssets/NearingExpiry";
import ExpiredAssets from "../components/scrapAssets/ExpiredAssets";
import ExpiringByCategory from "../components/scrapAssets/ExpiringByCategory";
import CategoryAssets from "../components/scrapAssets/CategoryAssets";
import CategoriesOverview from "../components/scrapAssets/CategoriesOverview";
import CreateScrapAsset from "../components/scrapAssets/CreateScrapAsset";
import WorkorderManagement from "../pages/WorkorderManagement";
import WorkOrderDetail from "../pages/WorkOrderDetail";
import AssetReport from "../pages/reports/AssetReport";
import AssetLifecycleReport from "../pages/reports/AssetLifecycleReport";
import MaintenanceHistory from "../pages/reports/MaintenanceHistory";
import AssetValuation from "../pages/reports/AssetValuation";
import AssetWorkflowHistory from "../pages/reports/AssetWorkflowHistory";
import BreakdownHistory from "../pages/reports/BreakdownHistory";
import ReportBuilder from "../components/reportModels/ReportBuilder";
import SerialNumberPrint from "../pages/reports/SerialNumberPrint";
import BulkUpload from "../pages/masterData/BulkUpload";

// import MaintenanceApprovalDetail from "../pages/MaintenanceApproval";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AllNotifications />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assign-department-assets"
          element={
            <ProtectedRoute>
              <MainLayout>
                <DepartmentWiseAssetAssignment />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assign-employee-assets"
          element={
            <ProtectedRoute>
              <MainLayout>
                <EmployeeWiseAssetAssignment />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/asset-selection"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AssetSelection />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/asset-detail/:asset_id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AssetsDetail />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/maintenance-approval"
          element={
            <ProtectedRoute>
              <MainLayout>
                <MaintenanceApproval />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/approval-detail/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <MaintenanceApprovalDetail />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/supervisor-approval"
          element={
            <ProtectedRoute requiredAppId="SUPERVISORAPPROVAL">
              <MainLayout>
                <MaintenanceSupervisor />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/supervisor-approval-detail/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <MaintSupervisorApproval />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/cron-management"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CronJobManagement />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/report-breakdown"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ReportsBreakdown />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/asset-report"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AssetReport />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/asset-lifecycle-report"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AssetLifecycleReport />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/maintenance-history"
          element={
            <ProtectedRoute>
              <MainLayout>
                <MaintenanceHistory />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/asset-valuation"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AssetValuation />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/asset-workflow-history"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AssetWorkflowHistory />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/serial-number-print"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SerialNumberPrint />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/serial-number-print/:assetId"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SerialNumberPrint />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/breakdown-history"
          element={
            <ProtectedRoute>
              <MainLayout>
                <BreakdownHistory />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/breakdown-selection"
          element={
            <ProtectedRoute>
              <MainLayout>
                <BreakdownSelection />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-breakdown"
          element={
            <ProtectedRoute>
              <MainLayout>
                <EditBreakdownReport />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/breakdown-details"
          element={
            <ProtectedRoute>
              <MainLayout>
                <BreakdownDetails />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-settings-view"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AdminSettingsView />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/maintenance-schedule-view"
          element={
            <ProtectedRoute>
              <MainLayout>
                <MaintenanceScheduleView />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/master-data/uploads"
          element={
            <ProtectedRoute requiredAppId="ROLES">
              <MainLayout>
                <BulkUpload />
              </MainLayout>
            </ProtectedRoute>
          }
        />




        
        <Route
          path="report-modal"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ReportBuilder />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit-logs-view"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AuditLogsView />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit-logs-view/config"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AuditLogConfig />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit-log-config"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AuditLogConfigPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/workorder-management"
          element={
            <ProtectedRoute requiredAppId="WORKORDERMANAGEMENT">
              <MainLayout>
                <WorkorderManagement />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/workorder-management/workorder-detail/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <WorkOrderDetail />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inspection-view"
          element={
            <ProtectedRoute>
              <MainLayout>
                <InspectionView />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/group-asset"
          element={
            <ProtectedRoute requiredAppId="GROUPASSET">
              <MainLayout>
                <GroupAsset />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/group-asset/create"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CreateGroupAsset />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/group-asset/edit/:groupId"
          element={
            <ProtectedRoute>
              <MainLayout>
                <EditGroupAsset />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/group-asset/view/:groupId"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ViewGroupAsset />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/assets"
          element={
            <ProtectedRoute requiredAppId="ASSETS" >
              <MainLayout>
                <Outlet />
              </MainLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<Assets />} />

          <Route path="add" element={<AddAssetForm />} />
        </Route>

        <Route
          path="/master-data/asset-types"
          element={
            <ProtectedRoute requiredAppId="ASSETTYPES">
              <MainLayout>
                <Outlet />
              </MainLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<AssetType />} />

          <Route path="add" element={<AddAssetType />} />
        </Route>

        <Route
          path="/master-data/prod-serv"
          element={
            <ProtectedRoute requiredAppId="PRODSERV">
              <MainLayout>
                <ProdServ />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/master-data/user-roles"
          element={
            <ProtectedRoute requiredAppId="USERS">
              <MainLayout>
                <UserRoles />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/assign-roles"
          element={
            <ProtectedRoute requiredAppId="USERS">
              <MainLayout>
                <AssignRoles />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/departments"
          element={
            <ProtectedRoute requiredAppId="DEPARTMENTS">
              <MainLayout>
                <Departments />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/departments-admin"
          element={
            <ProtectedRoute requiredAppId="DEPARTMENTSADMIN">
              <MainLayout>
                <DepartmentsAdmin />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/departments-asset"
          element={
            <ProtectedRoute requiredAppId="DEPARTMENTSASSET">
              <MainLayout>
                <DepartmentsAsset />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/organizations"
          element={
            <ProtectedRoute requiredAppId="ORGANIZATIONS">
              <MainLayout>
                <Organization />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/master-data/vendors"
          element={
            <ProtectedRoute requiredAppId="VENDORS">
              <MainLayout>
                <Outlet />
              </MainLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<Vendors />} />

          <Route path="add" element={<AddEntityForm />} />
        </Route>

        <Route
  path="/master-data/add-vendor"
  element={
    <ProtectedRoute requiredAppId="VENDORS">
      <MainLayout>
        <AddEntityForm />
      </MainLayout>
    </ProtectedRoute>
  }
/>

        {/* nesting routing  branches and add department  */}

        <Route
          path="/master-data/branches"
          element={
            <ProtectedRoute requiredAppId="BRANCHES">
              <MainLayout>
                <Outlet />
              </MainLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<Branches />} />

          <Route path="add" element={<AddBranch />} />
        </Route>

        <Route
          path="/scrap-sales"
          element={
            <ProtectedRoute requiredAppId="SCRAPSALES">
              <MainLayout>
                <ScrapSales />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scrap-sales/create"
          element={
            <ProtectedRoute requiredAppId="SCRAPSALES">
              <MainLayout>
                <CreateScrapSales />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scrap-sales/edit/:scrapId"
          element={
            <ProtectedRoute requiredAppId="SCRAPSALES">
              <MainLayout>
                <EditScrapSales />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scrap-sales/view/:scrapId"
          element={
            <ProtectedRoute requiredAppId="SCRAPSALES">
              <MainLayout>
                <ViewScrapSales />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Scrap Assets Routes */}
        <Route
          path="/scrap-assets"
          element={
            <ProtectedRoute requiredAppId="SCRAPASSETS">
              <MainLayout>
                <ScrapAssets />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/scrap-assets/nearing-expiry"
          element={
            <ProtectedRoute requiredAppId="SCRAPASSETS">
              <MainLayout>
                <NearingExpiry />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scrap-assets/expired"
          element={
            <ProtectedRoute requiredAppId="SCRAPASSETS">
              <MainLayout>
                <ExpiredAssets />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scrap-assets/categories"
          element={
            <ProtectedRoute requiredAppId="SCRAPASSETS">
              <MainLayout>
                <CategoriesOverview />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scrap-assets/by-category"
          element={
            <ProtectedRoute requiredAppId="SCRAPASSETS">
              <MainLayout>
                <ExpiringByCategory />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scrap-assets/by-category/:category"
          element={
            <ProtectedRoute requiredAppId="SCRAPASSETS">
              <MainLayout>
                <CategoryAssets />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scrap-assets/create"
          element={
            <ProtectedRoute requiredAppId="SCRAPASSETS">
              <MainLayout>
                <CreateScrapAsset />
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
