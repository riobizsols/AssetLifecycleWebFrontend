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

      {/* Main Content Area — min-w-0 lets the pane use full remaining width next to the sidebar */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex min-h-0 min-w-0 w-full flex-1 overflow-y-auto overflow-x-auto bg-gray-200 p-2 sm:p-3 md:p-4 lg:p-5">
          <div className="min-w-0 w-full max-w-none flex-1">{children}</div>
        </main>
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

