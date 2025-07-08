// src/layouts/MainLayout.jsx
import Sidebar from "../components/Sidebar";
import Header from "./Header";

export default function MainLayout({ children }) {
  return (
    <div className="flex h-screen">
      {/* Sidebar on the left */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 p-4 overflow-auto bg-gray-200">{children}</main>
      </div>
    </div>
  );
}
