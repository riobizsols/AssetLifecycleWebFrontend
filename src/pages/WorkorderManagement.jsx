import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import API from "../lib/axios";
import { filterData } from "../utils/filterData";
import { useLanguage } from "../contexts/LanguageContext";
import { toast } from "react-hot-toast";

const WorkorderManagement = () => {
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
  const [columns] = useState([
    { label: t('workorderManagement.workOrderID'), name: "ams_id", visible: true },
    { label: t('workorderManagement.assetID'), name: "asset_id", visible: true },
    { label: t('workorderManagement.description'), name: "description", visible: true },
    { label: t('workorderManagement.maintenanceType'), name: "maintenance_type_name", visible: true },
    { label: t('workorderManagement.startDate'), name: "act_maint_st_date", visible: true },
    { label: t('workorderManagement.status'), name: "status", visible: true },
    { label: t('workorderManagement.assetType'), name: "asset_type_name", visible: true },
  ]);

  useEffect(() => {
    const fetchWorkOrders = async () => {
      setIsLoading(true);
      try {
        const res = await API.get("/work-orders/all");
        const raw = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        // Helper function to check if value is empty and return "Not Set"
        const getDisplayValue = (value, dateFormat = false) => {
          if (dateFormat && value) {
            return new Date(value).toLocaleDateString();
          }
          if (value === null || value === undefined || value === "" || (typeof value === 'string' && value.trim() === '')) {
            return t('workorderManagement.notSet') || 'Not Set';
          }
          return value;
        };

        const formatted = raw.map((wo) => ({
          ...wo,
          ams_id: getDisplayValue(wo.ams_id),
          asset_id: getDisplayValue(wo.asset?.asset_id),
          description: getDisplayValue(wo.asset?.description),
          maintenance_type_name: getDisplayValue(wo.maintenance_type_name),
          act_maint_st_date: getDisplayValue(wo.act_maint_st_date, true),
          status: getDisplayValue(wo.status),
          asset_type_name: getDisplayValue(wo.asset_type?.asset_type_name),
        }));
        setData(formatted);
      } catch (err) {
        console.error("Failed to fetch work orders", err);
        toast.error(t('workorderManagement.failedToFetchWorkOrders'));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorkOrders();
  }, [t]);

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

  const handleRowClick = (row) => {
    navigate(`/workorder-management/workorder-detail/${row.ams_id}`, { state: { workOrder: row } });
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
        showActions={false}
        showAddButton={false}
      >
        {({ visibleColumns }) => {
          const filtered = filterData(data, filterValues, visibleColumns);
          const sorted = sortData(filtered);
          return (
            <CustomTable
              visibleColumns={visibleColumns}
              data={isLoading ? [] : sorted}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              rowKey="ams_id"
              showActions={false}
              onRowClick={handleRowClick}
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default WorkorderManagement;
