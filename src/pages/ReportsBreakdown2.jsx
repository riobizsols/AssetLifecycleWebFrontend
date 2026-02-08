import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import API from "../lib/axios";
import { filterData } from "../utils/filterData";
import { useNavigation } from "../hooks/useNavigation";
import { useAuthStore } from "../store/useAuthStore";
import { useLanguage } from "../contexts/LanguageContext";
import ReopenModal from "../components/reportbreakdown/ReopenModal";
import { Check, RefreshCw, Pencil } from "lucide-react";

const ReportsBreakdown2 = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({ sorts: [] });
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: "",
  });

  const [showReopenModal, setShowReopenModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Access control
  const { canEdit, canDelete, getAccessLevel } = useNavigation();
  const hasEditAccess = canEdit('EMPLOYEE REPORT BREAKDOWN');
  const hasDeleteAccess = canDelete('EMPLOYEE REPORT BREAKDOWN');
  const accessLevel = getAccessLevel('EMPLOYEE REPORT BREAKDOWN');
  const isReadOnly = accessLevel === 'D';
  
  // Debug logging
  console.log('ReportsBreakdown2 - Access Level:', accessLevel);
  console.log('ReportsBreakdown2 - Has Edit Access:', hasEditAccess);
  console.log('ReportsBreakdown2 - Has Delete Access:', hasDeleteAccess);
  console.log('ReportsBreakdown2 - Is Read Only:', isReadOnly);
  const [columns] = useState([
    { label: "Reported By", name: "reported_by", visible: true },
    { label: "Status", name: "status", visible: true },
    { label: "Description", name: "description", visible: true },
  ]);

  const handleEdit = (breakdown) => {
    navigate("/edit-breakdown", {
      state: {
        breakdown,
        // Employee Report Breakdown (Report Breakdown 2) should not show decision code on edit
        hideDecisionCode: true,
      },
    });
  };

  const fetchBreakdowns = async () => {
    if (!user) return; // Wait for user data to be available
    
    setIsLoading(true);
    try {
      const res = await API.get("/reportbreakdown/reports");
      const raw = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      
      // Match by user_id, emp_int_id, or dept_id depending on what's in reported_by
      const currentUserId = user?.user_id || user?.emp_int_id;
      const currentDeptId = user?.dept_id;
      
      const userBreakdowns = raw.filter((b) => {
        return b.reported_by === currentUserId || b.reported_by === currentDeptId;
      });
      
      const formatted = userBreakdowns.map((b) => ({
        ...b,
        created_on: b.created_on
          ? new Date(b.created_on).toLocaleString()
          : "",
      }));
      setData(formatted);
    } catch (err) {
      console.error("Failed to fetch breakdowns", err);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBreakdowns();
  }, [user]);

  const handleConfirmAction = async (abr_id) => {
    if (!window.confirm("Confirm this breakdown as resolved?")) return;
    try {
      // Trigger API call
      await API.post(`/reportbreakdown/${abr_id}/confirm`);
      
      // Immediate UI Refresh: Update local state without waiting for full refetch
      setData(prevData => 
        prevData.map(item => 
          item.abr_id === abr_id ? { ...item, status: 'CF' } : item
        )
      );
      
      alert("Breakdown confirmed successfully");
    } catch (err) {
      console.error("Failed to confirm breakdown", err);
      alert("Error confirming breakdown: " + (err.response?.data?.error || err.message));
    }
  };

  const handleReopenSubmit = async (notes, abr_id_from_modal) => {
    // Standardize on abr_id (snake_case) to avoid reference errors and match confirm logic
    const abr_id = abr_id_from_modal || selectedReport?.abr_id;

    if (!abr_id) {
      alert("No report selected or ID missing. Please reopen from the list and try again.");
      console.error('Reopen aborted: missing abr_id', { abr_id_from_modal, selectedReport });
      return;
    }

    try {
      await API.post(`/reportbreakdown/${abr_id}/reopen`, { notes });
      
      // Immediate UI Refresh: Update local state
      setData(prevData => 
        prevData.map(item => 
          item.abr_id === abr_id ? { ...item, status: 'IN' } : item
        )
      );
      
      alert("Breakdown reopened successfully");
      setShowReopenModal(false);
      setSelectedReport(null);
    } catch (err) {
      console.error("Failed to reopen breakdown", err);
      alert("Error reopening breakdown: " + (err.response?.data?.error || err.message));
    }
  };

  const handleSort = (column) => {
    setSortConfig((prevConfig) => {
      const { sorts } = prevConfig;
      const existingSort = sorts.find((s) => s.column === column);
      if (!existingSort) {
        return {
          sorts: [
            ...sorts,
            { column, direction: "asc", order: sorts.length + 1 },
          ],
        };
      } else if (existingSort.direction === "asc") {
        return {
          sorts: sorts.map((s) =>
            s.column === column ? { ...s, direction: "desc" } : s
          ),
        };
      } else {
        return {
          sorts: sorts
            .filter((s) => s.column !== column)
            .map((s, idx) => ({ ...s, order: idx + 1 })),
        };
      }
    });
  };

  const sortData = (rows) => {
    if (!sortConfig.sorts.length) return rows;
    return [...rows].sort((a, b) => {
      for (const { column, direction } of sortConfig.sorts) {
        const aValue = a[column];
        const bValue = b[column];
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        if (!isNaN(aValue) && !isNaN(bValue)) {
          const diff = direction === "asc" ? aValue - bValue : bValue - aValue;
          if (diff !== 0) return diff;
        } else {
          const diff =
            direction === "asc"
              ? String(aValue).localeCompare(String(bValue))
              : String(bValue).localeCompare(String(aValue));
          if (diff !== 0) return diff;
        }
      }
      return 0;
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilterValues((prev) => {
      if (filterType === "columnFilters") {
        return { ...prev, columnFilters: value };
      } else if (filterType === "fromDate" || filterType === "toDate") {
        return { ...prev, [filterType]: value };
      } else {
        return { ...prev, [filterType]: value };
      }
    });
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={hasEditAccess}
        showDeleteButton={hasDeleteAccess}
        showActions={true}
        isReadOnly={isReadOnly}
        onAdd={hasEditAccess ? () => navigate("/breakdown-selection2") : null}
      >
        {({ visibleColumns, showActions }) => {
          const filtered = filterData(data, filterValues, visibleColumns);
          const sorted = sortData(filtered);
          if (!isLoading && sorted.length === 0) {
            const visibleCols = visibleColumns.filter((col) => col.visible);
            const colSpan = visibleCols.length + (showActions ? 1 : 0);
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <p className="text-xl font-semibold text-gray-800">
                    {t('common.noDataFound')}
                  </p>
                </td>
              </tr>
            );
          }
          return (
            <>
              <CustomTable
                visibleColumns={visibleColumns}
                data={isLoading ? [] : sorted}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                rowKey="abr_id"
                showActions={true}
                isReadOnly={isReadOnly}
                renderActions={(row) => {
                  if (row.status === "CO" || row.status === "Completed") {
                    return (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmAction(row.abr_id);
                          }}
                          className="text-green-600 hover:text-green-800"
                          title="Confirm Completion"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReport(row);
                            setShowReopenModal(true);
                          }}
                          className="text-orange-600 hover:text-orange-800"
                          title="Reopen/Reject"
                        >
                          <RefreshCw size={18} />
                        </button>
                      </div>
                    );
                  }
                  // For Initiated or Pending, show View Details
                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(row);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="View Details"
                    >
                      <Pencil size={18} />
                    </button>
                  );
                }}
              />
              <ReopenModal
                show={showReopenModal}
                report={selectedReport}
                onClose={() => {
                  setShowReopenModal(false);
                  setSelectedReport(null);
                }}
                onConfirm={handleReopenSubmit}
              />
            </>
          );
        }}
      </ContentBox>
    </div>
  );
};

export default ReportsBreakdown2;
