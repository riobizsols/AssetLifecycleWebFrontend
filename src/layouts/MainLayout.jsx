// src/layouts/MainLayout.jsx
import DatabaseSidebar from "../components/DatabaseSidebar";
import Header from "./Header";

export default function MainLayout({ children }) {
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
}
