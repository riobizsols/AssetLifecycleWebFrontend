// src/layouts/MainLayout.jsx
import DatabaseSidebar from "../components/DatabaseSidebar";
import Header from "./Header";

export default function MainLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <DatabaseSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-gray-200 p-2 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
