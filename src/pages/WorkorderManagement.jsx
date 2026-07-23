import { showBackendTextToast } from '../utils/errorTranslation';
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import { filterData } from "../utils/filterData";
import { useLanguage } from "../contexts/LanguageContext";
import { toast } from "react-hot-toast";
import { useRevalidateOnFocus } from "../hooks/useRevalidateOnFocus";
import { applyListFilterChange } from "../utils/listFilterState";
import {
  formatWorkOrderRows,
  useWorkOrderStore,
} from "../store/useWorkOrderStore";

const WorkorderManagement = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const workOrders = useWorkOrderStore((s) => s.workOrders);
  const listLoading = useWorkOrderStore((s) => s.listLoading);
  const fetchWorkOrders = useWorkOrderStore((s) => s.fetchWorkOrders);

  const data = useMemo(
    () => formatWorkOrderRows(workOrders, t),
    [workOrders, t],
  );

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
    fetchWorkOrders({ revalidate: true }).catch((err) => {
      console.error("Failed to fetch work orders", err);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_WORKORDERMANAGEMENT_FAILEDTOFETCHWORKORDERS_46EB10AE',
        fallbackText: t('workorderManagement.failedToFetchWorkOrders'),
        type: 'error',
      });
    });
  }, [fetchWorkOrders, t]);

  useRevalidateOnFocus(() => {
    fetchWorkOrders({ revalidate: true });
  });

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

  const handleFilterChange = (columnName, value) => {
    setFilterValues((prev) => applyListFilterChange(prev, columnName, value));
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
        dateFilterField="act_maint_st_date"
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showActions={false}
        showAddButton={false}
        leadingActions={
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center text-[#0E2F4B] border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 bg-white"
            aria-label={t('common.back')}
          >
            <ArrowLeft size={18} />
          </button>
        }
      >
        {({ visibleColumns }) => {
          const filtered = filterData(data, filterValues, visibleColumns);
          const sorted = sortData(filtered);
          
          if (listLoading && sorted.length === 0) {
            const visibleCols = visibleColumns.filter((col) => col.visible);
            const colSpan = visibleCols.length;
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">{t('workorderManagement.loadingWorkOrders')}</p>
                  </div>
                </td>
              </tr>
            );
          }
          
          if (sorted.length === 0) {
            const visibleCols = visibleColumns.filter((col) => col.visible);
            const colSpan = visibleCols.length;
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-xl font-semibold text-gray-800">
                      {t('workorderManagement.noWorkOrdersFound')}
                    </p>
                  </div>
                </td>
              </tr>
            );
          }
          
          return (
            <CustomTable
              visibleColumns={visibleColumns}
              data={sorted}
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
