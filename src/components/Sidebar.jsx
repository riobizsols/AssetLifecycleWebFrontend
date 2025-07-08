import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { sidebarItems } from "../config/sidebarConfig";
import { useAuthStore } from "../store/useAuthStore";
import { Menu } from "lucide-react";

const Sidebar = () => {
  const { job_role_id } = useAuthStore();
  const location = useLocation();

  const [openDropdown, setOpenDropdown] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const toggleDropdown = (label) => {
    setOpenDropdown(openDropdown === label ? null : label);
  };

  const toggleSidebar = () => setCollapsed(!collapsed);

  const filteredItems = sidebarItems.filter((item) =>
    item.roles.includes(job_role_id)
  );

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } h-screen bg-[#0E2F4B] text-white shadow overflow-y-auto transition-all duration-300 relative`}
    >
      {/* Logo & Toggle Button */}
      <div className="flex justify-center items-center mb-6 px-4">
        {/* Logo (only when not collapsed) */}
        {!collapsed && (
          <img src="/logo.png" alt="Logo" className="h-10 md:h-[60px] w-auto" />
        )}

        {/* Toggle button (only on small screens) */}
        <button className="md:hidden text-white ml-20" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
      </div>

      {/* Navigation Items */}
      <ul className="px-2 pb-4 overflow-y-auto no-scrollbar">
        {filteredItems.map((item) => {
          const Icon = item.icon;

          if (item.children) {
            const isAnyChildActive = item.children.some((child) =>
              location.pathname.startsWith(child.path)
            );

            return (
              <li key={item.label} className="mb-2">
                <div
                  onClick={() => toggleDropdown(item.label)}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded ${
                    isAnyChildActive
                      ? "bg-[#FFC107] text-white"
                      : "hover:bg-[#143d65] text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={18} />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <span>{openDropdown === item.label ? "▲" : "▼"}</span>
                  )}
                </div>

                {!collapsed && openDropdown === item.label && (
                  <ul className="ml-6 mt-1">
                    {item.children
                      .filter((child) => child.roles.includes(job_role_id))
                      .map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <li key={child.path} className="mb-1">
                            <NavLink
                              to={child.path}
                              className={({ isActive }) =>
                                `flex items-center gap-2 px-3 py-2 rounded text-sm ${
                                  isActive
                                    ? "bg-[#FFC107] text-white"
                                    : "hover:bg-[#143d65] text-white"
                                }`
                              }
                            >
                              <ChildIcon size={18} />
                              <span>{child.label}</span>
                            </NavLink>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </li>
            );
          }

          return (
            <li key={item.path} className="mb-2">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded ${
                    isActive
                      ? "bg-[#FFC107] text-white"
                      : "hover:bg-[#143d65] text-white"
                  }`
                }
              >
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export default Sidebar;
