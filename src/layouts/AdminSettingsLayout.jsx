// src/layouts/AdminSettingsLayout.jsx
import { useEffect } from "react";
import DatabaseSidebar from "../components/DatabaseSidebar";
import Header from "./Header";
import { AdminSettingsProvider, useAdminSettings } from "../contexts/AdminSettingsContext";

const AdminSettingsLayoutContent = ({ children }) => {
  const { setIsAdminSettingsMode } = useAdminSettings();

  useEffect(() => {
    setIsAdminSettingsMode(true);
    return () => {
      setIsAdminSettingsMode(false);
    };
  }, [setIsAdminSettingsMode]);

  return (
    <div className="flex h-screen">
      {/* Database-driven Sidebar on the left */}
      <DatabaseSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-auto bg-gray-200">{children}</main>
      </div>
    </div>
  );
};

export default function AdminSettingsLayout({ children }) {
  return (
    <AdminSettingsProvider>
      <AdminSettingsLayoutContent>{children}</AdminSettingsLayoutContent>
    </AdminSettingsProvider>
  );
}

