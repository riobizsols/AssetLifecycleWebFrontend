import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Login from "../pages/auth/Login";
import TenantLogin from "../pages/auth/TenantLogin";
import Dashboard from "../pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../layouts/MainLayout";
import ForgotPassword from "../pages/auth/ForgetPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import ChangePassword from "../pages/auth/ChangePassword";
import RequestPasswordChange from "../pages/auth/RequestPasswordChange";
import SetupWizard from "../pages/setup/SetupWizard";
import TenantSetup from "../pages/tenant/TenantSetup";
import Assets from "../pages/Assets";
import UserRoles from "../pages/masterData/UserRoles";
import JobRoles from "../pages/masterData/JobRoles";
import CreateJobRoleNavigation from "../components/jobRoles/CreateJobRoleNavigation";
import AssignRoles from "../components/AssignRoles";
import CreateUser from "../pages/masterData/CreateUser";
import Departments from "../pages/masterData/Departments";
import Branches from "../pages/masterData/Branches";
import AddBranch from "../components/AddBranch";
import DepartmentsAdmin from "../pages/masterData/DepartmentsAdmin";
import DepartmentsAsset from "../pages/masterData/DepartmentsAsset";
import Organization from "../pages/masterData/Organization";
import Vendors from "../pages/masterData/Vendors";
import AddEntityForm from "../components/AddEntityForm";
import ProdServ from "../pages/masterData/ProdServ";
import Properties from "../pages/masterData/Properties";
import BreakdownReasonCodes from "../pages/masterData/BreakdownReasonCodes";
import AddAssetForm from "../components/assets/AddAssetForm";
import AddAssetType from "../components/AddAssetType";
import AssetType from "../pages/AssetType";
import DepartmentWiseAssetAssignment from "../pages/DepartmentWiseAssetAssignment";
import EmployeeWiseAssetAssignment from "../pages/EmployeeWiseAssetAssignment";
import AssetSelection from "../components/assetAssignment/AssetSelection";
import AssetsDetail from "../components/assetAssignment/AssetsDetail";
import MaintenanceApproval from "../pages/MaintenanceApproval";
import VendorRenewalApproval from "../pages/VendorRenewalApproval";
import NotificationsPanel from "../components/dashboardModules/NotificationsPanel";
import AllNotifications from "../components/AllNotifications";
import MaintenanceApprovalDetail from "../components/MaintenanceApprovalDetail";
import InspectionApproval from "../pages/InspectionApproval";
import InspectionApprovalDetail from "../components/InspectionApprovalDetail";
import ScrapMaintenanceApproval from "../pages/ScrapMaintenanceApproval";
import ScrapMaintenanceApprovalDetail from "../components/ScrapMaintenanceApprovalDetail";
import MaintenanceSupervisor from "../pages/MaintenanceSupervisor";
import CreateManualMaintenance from "../pages/CreateManualMaintenance";
import CronJobManagement from "../pages/CronJobManagement";
import MaintSupervisorApproval from "../components/MaintSupervisorApproval";
import ReportsBreakdown from "../pages/ReportsBreakdown";
import ReportsBreakdown2 from "../pages/ReportsBreakdown2";
import BreakdownSelection from "../components/reportbreakdown/BreakdownSelection";
import BreakdownSelection2 from "../components/reportbreakdown/BreakdownSelection2";
import BreakdownDetails from "../components/reportbreakdown/BreakdownDetails";
import BreakdownDetails2 from "../components/reportbreakdown/BreakdownDetails2";
import EditBreakdownReport from "../components/reportbreakdown/EditBreakdownReport";
import AdminSettingsView from "../pages/AdminSettingsView";
import CreateMaintenanceFrequency from "../components/CreateMaintenanceFrequency";
import MaintenanceScheduleView from "../pages/MaintenanceScheduleView";
import AuditLogsView from "../pages/AuditLogsView";
import AuditLogConfig from "../components/AuditLogConfig";
import AuditLogConfigPage from "../pages/AuditLogConfigPage";
import InspectionView from "../pages/InspectionView";
import CreateManualInspection from "../pages/CreateManualInspection";
import InspectionExecutionDetail from "../pages/InspectionExecutionDetail";
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
import ScrapGroupedAssets from "../pages/ScrapGroupedAssets";
import WorkorderManagement from "../pages/WorkorderManagement";
import WorkOrderDetail from "../pages/WorkOrderDetail";
import AssetReport from "../pages/reports/AssetReport";
import AssetLifecycleReport from "../pages/reports/AssetLifecycleReport";
import MaintenanceHistory from "../pages/reports/MaintenanceHistory";
import AssetValuation from "../pages/reports/AssetValuation";
import AssetWorkflowHistory from "../pages/reports/AssetWorkflowHistory";
import BreakdownHistory from "../pages/reports/BreakdownHistory";
import UsageBasedAssetReport from "../pages/reports/UsageBasedAssetReport";
import ReportBuilder from "../components/reportModels/ReportBuilder";
import SerialNumberPrint from "../pages/reports/SerialNumberPrint";
import BulkSerialNumberPrint from "../pages/reports/BulkSerialNumberPrint";
import BulkUpload from "../pages/masterData/BulkUpload";
import SLAReport from "../pages/reports/SLAReport";
import QAAuditReport from "../pages/reports/QAAuditReport";
import AdminSettingsRedirect from "./AdminSettingsRedirect";
import AdminSettingsLayout from "../layouts/AdminSettingsLayout";
import ColumnAccessConfig from "../pages/adminSettings/ColumnAccessConfig";
import MaintenanceConfiguration from "../pages/adminSettings/MaintenanceConfiguration";
import Certifications from "../pages/adminSettings/Certifications";
import InspectionChecklists from "../pages/adminSettings/InspectionChecklists";
import AssetTypeChecklistMapping from "../pages/masterData/AssetTypeChecklistMapping";
import CreateAssetTypeChecklistMapping from "../pages/masterData/CreateAssetTypeChecklistMapping";
import InspectionFrequency from "../pages/masterData/InspectionFrequency";
import CreateInspectionFrequency from "../components/CreateInspectionFrequency";
import TechnicianCertificates from "../pages/TechnicianCertificates";
import TechCertApprovals from "../pages/TechCertApprovals";
import CostCenterTransfer from "../pages/CostCenterTransfer";

// import MaintenanceApprovalDetail from "../pages/MaintenanceApproval";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/tenant-login" element={<TenantLogin />} />
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/tenant-setup" element={<TenantSetup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/request-password-change"
          element={<RequestPasswordChange />}
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />
        <Route
          path="/not-authorized"
          element={
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
              <div className="text-center">
                <div className="text-6xl mb-4">🚫</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Access Denied
                </h1>
                <p className="text-gray-600 mb-4">
                  You don't have permission to access this page.
                </p>
                <button
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          }
        />
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
          path="/technician-certificates"
          element={
            <ProtectedRoute>
              <MainLayout>
                <TechnicianCertificates />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tech-cert-approvals"
          element={
            <ProtectedRoute>
              <MainLayout>
                <TechCertApprovals />
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
          path="/inspection-approval"
          element={
            <ProtectedRoute>
              <MainLayout>
                <InspectionApproval />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inspection-approval-detail/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <InspectionApprovalDetail />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scrap-approval"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ScrapMaintenanceApproval />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor-renewal-approval"
          element={
            <ProtectedRoute>
              <MainLayout>
                <VendorRenewalApproval />
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
          path="/scrap-approval-detail/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ScrapMaintenanceApprovalDetail />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance-list"
          element={
            <ProtectedRoute requiredAppId="SUPERVISORAPPROVAL">
              <MainLayout>
                <MaintenanceSupervisor />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance-list/create"
          element={
            <ProtectedRoute requiredAppId="SUPERVISORAPPROVAL">
              <MainLayout>
                <CreateManualMaintenance />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/maintenance-list-detail/:id"
          element={
            <ProtectedRoute requiredAppId="SUPERVISORAPPROVAL">
              <MainLayout>
                <MaintSupervisorApproval />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/cron-management"
          element={
            <ProtectedRoute requiredAppId="CRONMANAGEMENT">
              <MainLayout>
                <CronJobManagement />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/report-breakdown"
          element={
            <ProtectedRoute requiredAppId="REPORTBREAKDOWN">
              <MainLayout>
                <ReportsBreakdown />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/employee-report-breakdown"
          element={
            <ProtectedRoute requiredAppId="EMPLOYEE REPORT BREAKDOWN">
              <MainLayout>
                <ReportsBreakdown2 />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/asset-report"
          element={
            <ProtectedRoute requiredAppId="ASSETREPORT">
              <MainLayout>
                <AssetReport />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/asset-lifecycle-report"
          element={
            <ProtectedRoute requiredAppId="ASSETLIFECYCLEREPORT">
              <MainLayout>
                <AssetLifecycleReport />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/maintenance-history"
          element={
            <ProtectedRoute requiredAppId="MAINTENANCEHISTORY">
              <MainLayout>
                <MaintenanceHistory />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/asset-valuation"
          element={
            <ProtectedRoute requiredAppId="ASSETVALUATION">
              <MainLayout>
                <AssetValuation />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/asset-workflow-history"
          element={
            <ProtectedRoute requiredAppId="ASSETWORKFLOWHISTORY">
              <MainLayout>
                <AssetWorkflowHistory />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/serial-number-print"
          element={
            <ProtectedRoute requiredAppId="SERIALNUMBERPRINT">
              <MainLayout>
                <SerialNumberPrint />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/serial-number-print/:assetId"
          element={
            <ProtectedRoute requiredAppId="SERIALNUMBERPRINT">
              <MainLayout>
                <SerialNumberPrint />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/bulk-serial-number-print"
          element={
            <ProtectedRoute requiredAppId="SERIALNUMBERPRINT">
              <MainLayout>
                <BulkSerialNumberPrint />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        {/* Bulk Serial Number Print route under admin settings */}
        <Route
          path="/adminsettings/configuration/bulk-serial-number-print"
          element={
            <ProtectedRoute requiredAppId="BULKSERIALNUMBERPRINT">
              <AdminSettingsLayout>
                <BulkSerialNumberPrint />
              </AdminSettingsLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/breakdown-history"
          element={
            <ProtectedRoute requiredAppId="BREAKDOWNHISTORY">
              <MainLayout>
                <BreakdownHistory />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/usage-based-asset"
          element={
            <ProtectedRoute requiredAppId="USAGEBASEDASSETREPORT">
              <MainLayout>
                <UsageBasedAssetReport />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/sla-report"
          element={
            <ProtectedRoute requiredAppId="SLAREPORT">
              <MainLayout>
                <SLAReport />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/qa-audit-report"
          element={
            <ProtectedRoute requiredAppId="QAAUDITREPORT">
              <MainLayout>
                <QAAuditReport />
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
          path="/breakdown-selection2"
          element={
            <ProtectedRoute>
              <MainLayout>
                <BreakdownSelection2 />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-breakdown"
          element={
            <ProtectedRoute requiredAppId="REPORTBREAKDOWN">
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
          path="/breakdown-details2"
          element={
            <ProtectedRoute>
              <MainLayout>
                <BreakdownDetails2 />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-settings-view"
          element={
            <ProtectedRoute requiredAppId="ADMINSETTINGS">
              <MainLayout>
                <AdminSettingsView />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-settings/maintenance-frequency/add"
          element={
            <ProtectedRoute requiredAppId="ADMINSETTINGS">
              <MainLayout>
                <CreateMaintenanceFrequency />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/maintenance-schedule-view"
          element={
            <ProtectedRoute requiredAppId="MAINTENANCESCHEDULE">
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
            <ProtectedRoute requiredAppId="AUDITLOGCONFIG">
              <MainLayout>
                <AuditLogConfig />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit-log-config"
          element={
            <ProtectedRoute requiredAppId="AUDITLOGCONFIG">
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
            <ProtectedRoute requiredAppId="WORKORDERMANAGEMENT">
              <MainLayout>
                <WorkOrderDetail />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inspection-view"
          element={
            <ProtectedRoute requiredAppId="INSPECTIONVIEW">
              <MainLayout>
                <InspectionView />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inspection-view/create"
          element={
            <ProtectedRoute requiredAppId="INSPECTIONVIEW">
              <MainLayout>
                <CreateManualInspection />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inspection-view/:id"
          element={
            <ProtectedRoute requiredAppId="INSPECTIONVIEW">
              <MainLayout>
                <InspectionExecutionDetail />
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
            <ProtectedRoute requiredAppId="ASSETS">
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
          path="/cost-center-transfer"
          element={
            <ProtectedRoute requiredAppId="COSTCENTERTRANSFER">
              <MainLayout>
                <CostCenterTransfer />
              </MainLayout>
            </ProtectedRoute>
          }
        />

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
          path="/master-data/job-roles"
          element={
            <ProtectedRoute requiredAppId="USERROLES">
              <MainLayout>
                <JobRoles />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/master-data/job-roles/create-navigation"
          element={
            <ProtectedRoute requiredAppId="USERROLES">
              <MainLayout>
                <CreateJobRoleNavigation />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/job-roles/update-navigation/:navId"
          element={
            <ProtectedRoute requiredAppId="USERROLES">
              <MainLayout>
                <CreateJobRoleNavigation />
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
          path="/master-data/create-user"
          element={
            <ProtectedRoute requiredAppId="USERS">
              <MainLayout>
                <CreateUser />
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
        <Route
          path="/scrap-assets/group-scrap/:groupId"
          element={
            <ProtectedRoute requiredAppId="SCRAPASSETS">
              <MainLayout>
                <ScrapGroupedAssets />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin Settings Routes */}
        <Route path="/adminsettings" element={<AdminSettingsRedirect />} />
        <Route
          path="/adminsettings/configuration"
          element={
            <ProtectedRoute requiredAppId="ADMINSETTINGS">
              <AdminSettingsLayout>
                <AdminSettingsView />
              </AdminSettingsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/adminsettings/configuration/data-config"
          element={
            <ProtectedRoute requiredAppId="ADMINSETTINGS">
              <AdminSettingsLayout>
                <ColumnAccessConfig />
              </AdminSettingsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/adminsettings/configuration/maintenance-config"
          element={
            <ProtectedRoute requiredAppId="ADMINSETTINGS">
              <AdminSettingsLayout>
                <MaintenanceConfiguration />
              </AdminSettingsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/inspection-checklists"
          element={
            <ProtectedRoute requiredAppId="INSPECTIONCHECKLISTS">
              <MainLayout>
                <InspectionChecklists />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/asset-type-checklist-mapping"
          element={
            <ProtectedRoute requiredAppId="ASSETTYPECHECKLISTMAPPING">
              <MainLayout>
                <AssetTypeChecklistMapping />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/asset-type-checklist-mapping/create"
          element={
            <ProtectedRoute requiredAppId="ASSETTYPECHECKLISTMAPPING">
              <MainLayout>
                <CreateAssetTypeChecklistMapping />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/inspection-frequency"
          element={
            <ProtectedRoute requiredAppId="INSPECTIONFREQUENCY">
              <MainLayout>
                <InspectionFrequency />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/inspection-frequency/create"
          element={
            <ProtectedRoute requiredAppId="INSPECTIONFREQUENCY">
              <MainLayout>
                <CreateInspectionFrequency />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/certifications"
          element={
            <ProtectedRoute requiredAppId="CERTIFICATIONS">
              <MainLayout>
                <Certifications />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/adminsettings/configuration/properties"
          element={
            <ProtectedRoute requiredAppId="ADMINSETTINGS">
              <AdminSettingsLayout>
                <Properties />
              </AdminSettingsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/adminsettings/configuration/breakdown-reason-codes"
          element={
            <ProtectedRoute requiredAppId="ADMINSETTINGS">
              <AdminSettingsLayout>
                <BreakdownReasonCodes />
              </AdminSettingsLayout>
            </ProtectedRoute>
          }
        />
        {/* Job Roles routes under admin settings - simplified paths */}
        <Route
          path="/adminsettings/configuration/job-roles"
          element={
            <ProtectedRoute requiredAppId="USERROLES">
              <AdminSettingsLayout>
                <JobRoles />
              </AdminSettingsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/adminsettings/configuration/job-roles/create-navigation"
          element={
            <ProtectedRoute requiredAppId="USERROLES">
              <AdminSettingsLayout>
                <CreateJobRoleNavigation />
              </AdminSettingsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/adminsettings/configuration/job-roles/update-navigation/:navId"
          element={
            <ProtectedRoute requiredAppId="USERROLES">
              <AdminSettingsLayout>
                <CreateJobRoleNavigation />
              </AdminSettingsLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
