import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Login from "../pages/auth/Login";
import Dashboard from "../pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../layouts/MainLayout";
import ForgotPassword from "../pages/auth/ForgetPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import Assets from "../pages/Assets";
import Users from "../pages/masterData/Users";
import Departments from "../pages/masterData/Departments";
import Branches from "../pages/masterData/Branches";
import AddBranch from "../components/AddBranch";
import DepartmentsAdmin from "../pages/masterData/DepartmentsAdmin";
import DepartmentsAsset from "../pages/masterData/DepartmentsAsset";
import Organization from "../pages/masterData/Organization";
import Vendors from "../pages/masterData/Vendors";
import AddEntityForm from "../components/AddEntityForm";
import ProdServ from "../pages/masterData/ProdServ";
import AddAssetForm from "../components/AddAssetForm";
import AddAssetType from "../components/AddAssetType";
import AssetType from "../pages/AssetType";

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
            path="/assets"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
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
            <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
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
            <ProtectedRoute allowedRoles={["super_admin", "employee"]}>
              <MainLayout>
                <ProdServ />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/master-data/users"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
              <MainLayout>
                <Users />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/departments"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
              <MainLayout>
                <Departments />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/departments-admin"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
              <MainLayout>
                <DepartmentsAdmin />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/departments-asset"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
              <MainLayout>
                <DepartmentsAsset />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data/organizations"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
              <MainLayout>
                <Organization />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        


      <Route
          path="/master-data/vendors"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
              <MainLayout>
                <Outlet />
              </MainLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<Vendors />} />

          <Route path="add" element={<AddEntityForm />} />
        </Route>

        {/* nesting routing  branches and add department  */}

        <Route
          path="/master-data/branches"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
              <MainLayout>
                <Outlet />
              </MainLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<Branches />} />

          <Route path="add" element={<AddBranch />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
