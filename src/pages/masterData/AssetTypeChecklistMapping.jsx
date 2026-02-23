import React, { useState, useEffect } from "react";
import { 
  Plus, Edit2, Trash2, X, Search 
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import API from "../../lib/axios";
import ContentBox from "../../components/ContentBox";
import CustomTable from "../../components/CustomTable";

const AssetTypeChecklistMapping = () => {
  const navigate = useNavigate();

  // Column definitions for mapping summary table
  const columns = [
    { label: "Asset Type", name: "asset_type_name", visible: true },
    { label: "Asset Name (Specific)", name: "asset_name", visible: true },
    { label: "Total Questions", name: "total_questions", visible: true },
  ];

  // Main view state
  const [mappingSummaries, setMappingSummaries] = useState([]);
  const [isLoadingMain, setIsLoadingMain] = useState(false);
  
  // Selection & Deletion state
  const [selectedRows, setSelectedRows] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchMappingSummaries();
  }, []);

  const fetchMappingSummaries = async () => {
    setIsLoadingMain(true);
    try {
      const response = await API.get("/asset-type-checklist-mapping/all");
      const fetchedSummaries = Array.isArray(response.data?.data) 
        ? response.data.data.map((item, index) => ({ ...item, rowId: index })) 
        : [];
      setMappingSummaries(fetchedSummaries);
    } catch (error) {
      console.error("Error fetching mapping summaries:", error);
      toast.error("Failed to load mappings");
    } finally {
      setIsLoadingMain(false);
    }
  };

  const handleDelete = async () => {
    if (selectedRows.length === 0) return false;
    
    setIsDeleting(true);
    let successCount = 0;
    try {
      for (const rowId of selectedRows) {
        const row = mappingSummaries.find(m => m.rowId === rowId);
        if (row) {
          const params = { assetTypeId: row.at_id };
          if (row.asset_id) params.assetId = row.asset_id;
          
          await API.delete("/asset-type-checklist-mapping", { params });
          successCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} mapping group(s)`);
        fetchMappingSummaries();
        setSelectedRows([]);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting mapping groups:", error);
      toast.error("Failed to delete some mappings");
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const openAddPage = () => {
    navigate("/master-data/asset-type-checklist-mapping/create");
  };

  const openEditPage = (mapping) => {
    navigate(`/master-data/asset-type-checklist-mapping/create?atId=${mapping.at_id}${mapping.asset_id ? "&assetId=" + mapping.asset_id : ""}`);
  };

  return (
    <div className="p-4">
      <ContentBox 
        onAdd={openAddPage}
        filters={columns}
        onSort={() => {}}
        sortConfig={{ sorts: [] }}
        data={mappingSummaries}
        showActions={true}
        showAddButton={true}
        showHeaderCheckbox={true}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onDeleteSelected={handleDelete}
        rowKey="rowId"
      >
        {({ visibleColumns, showActions }) => (
          <CustomTable
            visibleColumns={visibleColumns}
            data={isLoadingMain ? [] : mappingSummaries}
            onEdit={openEditPage}
            rowKey="rowId"
            showActions={showActions}
            showCheckbox={true}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            renderCell={(col, row) => {
              if (col.name === "asset_type_name") {
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{row.asset_type_name}</span>
                        <span className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">{row.at_id}</span>
                    </div>
                );
              }
              if (col.name === "asset_name") {
                return row.asset_name ? (
                    <div className="flex flex-col">
                        <span className="text-gray-900">{row.asset_name}</span>
                        <span className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">{row.asset_id}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">All Assets of this Type</span>
                  );
              }
              if (col.name === "total_questions") {
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                      {row.total_questions} Questions
                    </span>
                );
              }
              return row[col.name];
            }}
          />
        )}
      </ContentBox>
    </div>
  );
};

export default AssetTypeChecklistMapping;
