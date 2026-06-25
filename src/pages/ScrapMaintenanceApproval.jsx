import { showBackendTextToast } from '../utils/errorTranslation';
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import { filterData } from "../utils/filterData";
import { toast } from "react-hot-toast";
import { useLanguage } from "../contexts/LanguageContext";
import { useRevalidateOnFocus } from "../hooks/useRevalidateOnFocus";
import {
  formatScrapApprovalRows,
  useScrapApprovalStore,
} from "../store/useScrapApprovalStore";

const ScrapMaintenanceApproval = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: "",
  });

  const approvals = useScrapApprovalStore((s) => s.approvals);
  const listLoading = useScrapApprovalStore((s) => s.listLoading);
  const fetchApprovals = useScrapApprovalStore((s) => s.fetchApprovals);

  const data = useMemo(
    () => formatScrapApprovalRows(approvals, t),
    [approvals, t],
  );

  const columns = [
    { label: t('scrapApproval.workflowId'), name: "wfscrap_h_id", visible: true },
    { label: t('scrapApproval.assetType'), name: "asset_type_name", visible: true },
    { label: t('scrapApproval.groupId'), name: "assetgroup_id", visible: true },
    { label: t('scrapApproval.name'), name: "display_name", visible: true },
    { label: t('scrapApproval.assets'), name: "asset_count", visible: true },
    { label: t('scrapApproval.scrapType'), name: "scrap_type_display", visible: true },
    { label: t('scrapApproval.status'), name: "status", visible: true },
    { label: t('scrapApproval.createdOn'), name: "created_on", visible: true },
  ];

  useEffect(() => {
    fetchApprovals({ revalidate: true }).catch((err) => {
      console.error("Failed to fetch scrap approvals", err);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_SCRAPAPPROVAL_FAILEDTOFETCH_2CE34094',
        fallbackText: t('scrapApproval.failedToFetch'),
        type: 'error',
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchApprovals]);

  useRevalidateOnFocus(() => {
    fetchApprovals({ revalidate: true });
  });

  const handleFilterChange = (columnName, value) => {
    if (columnName === "columnFilters") {
      setFilterValues((prev) => ({ ...prev, columnFilters: value }));
      return;
    }
    if (columnName === "fromDate" || columnName === "toDate") {
      setFilterValues((prev) => ({ ...prev, [columnName]: value }));
      return;
    }

    setFilterValues((prev) => ({
      ...prev,
      columnFilters: prev.columnFilters.filter((f) => f.column !== columnName),
      ...(value && {
        columnFilters: [
          ...prev.columnFilters.filter((f) => f.column !== columnName),
          { column: columnName, value },
        ],
      }),
    }));
  };

  const filters = [
    ...columns.map((col) => ({
      label: col.label,
      name: col.name,
      visible: col.visible,
      options:
        col.name === "status"
          ? [
              { label: t('scrapApproval.statusOptions.initiated'), value: "IN" },
              { label: t('scrapApproval.statusOptions.inProgress'), value: "IP" },
              { label: t('scrapApproval.statusOptions.completed'), value: "CO" },
              { label: t('scrapApproval.statusOptions.cancelled'), value: "CA" },
            ]
          : col.name === "scrap_type_display"
          ? [
              { label: t('scrapApproval.scrapTypeOptions.sales'), value: t('scrapApproval.scrapTypeOptions.sales') },
              { label: t('scrapApproval.scrapTypeOptions.asset'), value: t('scrapApproval.scrapTypeOptions.asset') },
            ]
          : [],
      onChange: (value) => handleFilterChange(col.name, value),
    })),
  ];

  const handleRowClick = (row) => {
    useScrapApprovalStore
      .getState()
      .fetchWorkflowDetail(row.wfscrap_h_id, { revalidate: true });
    navigate(`/scrap-approval-detail/${row.wfscrap_h_id}?context=SCRAPMAINTENANCEAPPROVAL`, {
      state: { context: "SCRAPMAINTENANCEAPPROVAL" },
    });
  };

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={false}
        showDeleteButton={false}
        showActions={false}
        title={null}
      >
        {({ visibleColumns, showActions }) => {
          const filtered = filterData(data, filterValues, visibleColumns);

          const visibleCols = visibleColumns.filter((c) => c.visible);
          const colSpan = visibleCols.length + (showActions ? 1 : 0);

          if (listLoading && data.length === 0) {
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">{t('scrapApproval.loading')}</p>
                  </div>
                </td>
              </tr>
            );
          }

          if (filtered.length === 0) {
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <p className="text-xl font-semibold text-gray-800">{t('scrapApproval.noData')}</p>
                </td>
              </tr>
            );
          }

          return (
            <CustomTable
              columns={visibleColumns}
              visibleColumns={visibleColumns}
              data={filtered}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              rowKey="wfscrap_h_id"
              showActions={showActions}
              onRowClick={handleRowClick}
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default ScrapMaintenanceApproval;
