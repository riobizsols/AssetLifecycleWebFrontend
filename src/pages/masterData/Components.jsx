import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigation } from "../../hooks/useNavigation";
import ComponentsTab from "../../components/opc/ComponentsTab";
import ComponentTagMappingTab from "../../components/opc/ComponentTagMappingTab";

const TABS = [
  { id: "components", label: "Components" },
  { id: "mapping", label: "Component-Tag Mapping" },
];

const Components = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.some((t) => t.id === searchParams.get("tab")) ? searchParams.get("tab") : "components";
  const [refreshKey, setRefreshKey] = useState(0);

  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess("OPCCOMPONENTS");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex flex-wrap -mb-px" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSearchParams({ tab: tab.id }, { replace: true })}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-[#0E2F4B] text-[#0E2F4B]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-4">
        {activeTab === "components" && (
          <ComponentsTab canEdit={canEdit} onChanged={() => setRefreshKey((k) => k + 1)} />
        )}
        {activeTab === "mapping" && <ComponentTagMappingTab canEdit={canEdit} refreshKey={refreshKey} />}
      </div>
    </div>
  );
};

export default Components;
