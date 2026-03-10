import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import API from "../lib/axios";
import { filterData } from "../utils/filterData";
import { useNavigation } from "../hooks/useNavigation";
import { useLanguage } from "../contexts/LanguageContext";
import { Pencil } from "lucide-react";
import { toast } from "react-hot-toast";

const ReportsBreakdown = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({ sorts: [] });
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: "",
  });

  // Access control
  const { canEdit, canDelete, getAccessLevel } = useNavigation();
  const hasEditAccess = canEdit("REPORTBREAKDOWN");
  const hasDeleteAccess = canDelete("REPORTBREAKDOWN");
  const accessLevel = getAccessLevel("REPORTBREAKDOWN");
  const isReadOnly = accessLevel === "D";

  // Debug logging
  console.log("ReportsBreakdown - Access Level:", accessLevel);
  console.log("ReportsBreakdown - Has Edit Access:", hasEditAccess);
  console.log("ReportsBreakdown - Has Delete Access:", hasDeleteAccess);
  console.log("ReportsBreakdown - Is Read Only:", isReadOnly);
  const columns = useMemo(() => [
    { label: t("breakdownDetails.reportedBy"), name: "reported_by", visible: true },
    { label: t("breakdownDetails.status"), name: "status", visible: true },
    { label: t("breakdownDetails.description"), name: "description", visible: true },
  ], [t]);

  const handleEdit = (breakdown) => {
    navigate("/edit-breakdown", { state: { breakdown } });
  };

  const fetchBreakdowns = async () => {
    setIsLoading(true);
    try {
      const res = await API.get("/reportbreakdown/reports");
      const raw = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      const formatted = raw.map((b) => ({
        ...b,
        created_on: b.created_at
          ? new Date(b.created_at).toLocaleString()
          : "",
      }));
      setData(formatted);
    } catch (err) {
      console.error("Failed to fetch breakdowns", err);
      toast.error(t("breakdownDetails.failedToFetchBreakdownReports"));
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBreakdowns();
  }, []);

  const handleDeleteSelected = async () => {
    if (!hasDeleteAccess) {
      toast.error(t("breakdownDetails.noPermissionToDeleteBreakdownReports"));
      return false;
    }

    if (selectedRows.length === 0) {
      toast.error(t("breakdownDetails.pleaseSelectBreakdownReportsToDelete"));
      return false;
    }

    try {
      const deletePromises = selectedRows.map(abrId => 
        API.delete(`/reportbreakdown/${abrId}`)
      );
      
      const results = await Promise.allSettled(deletePromises);
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.data?.success).length;
      const failureCount = results.length - successCount;
      
      if (successCount > 0) {
        toast.success(t("breakdownDetails.successfullyDeletedBreakdownReports", { count: successCount }));
        setSelectedRows([]);
        await fetchBreakdowns(); // Refresh the data
      }
      
      if (failureCount > 0) {
        const failedResults = results.filter(r => r.status === 'rejected' || !r.value.data?.success);
        const errorMessages = failedResults.map(r => {
          if (r.status === 'rejected') {
            return r.reason?.response?.data?.details || r.reason?.message || t("breakdownDetails.unknownError");
          }
          return r.value.data?.details || r.value.data?.error || t("breakdownDetails.failedToDeleteGeneric");
        });
        
        toast.error(t("breakdownDetails.failedToDeleteReportsCount", { count: failureCount, message: errorMessages[0] }));
      }
      
      return successCount > 0;
    } catch (err) {
      console.error("Error deleting breakdown reports:", err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || t("breakdownDetails.failedToDeleteBreakdownReports");
      toast.error(errorMessage);
      return false;
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
            s.column === column ? { ...s, direction: "desc" } : s,
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
        rowKey="abr_id"
        showAddButton={hasEditAccess}
        showDeleteButton={hasDeleteAccess}
        showActions={true}
        isReadOnly={isReadOnly}
        onAdd={hasEditAccess ? () => navigate("/breakdown-selection") : null}
        onDeleteSelected={handleDeleteSelected}
      >
        {({ visibleColumns, showActions }) => {
          const filtered = filterData(data, filterValues, visibleColumns);
          const sorted = sortData(filtered);
          if (!isLoading && sorted.length === 0) {
            const colSpan = visibleColumns.filter((col) => col.visible).length + (showActions ? 1 : 0);
            return (
              <tr>
                <td colSpan={colSpan} className="py-16">
                  <div className="flex flex-col items-center justify-center w-full">
                    <p className="text-xl font-semibold text-gray-800">
                      {t("common.noDataFound")}
                    </p>
                  </div>
                </td>
              </tr>
            );
          }
          return (
            <CustomTable
              visibleColumns={visibleColumns}
              data={isLoading ? [] : sorted}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              rowKey="abr_id"
              showActions={true}
              isReadOnly={isReadOnly}
              onEdit={handleEdit}
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default ReportsBreakdown;
