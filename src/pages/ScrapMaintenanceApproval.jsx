import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import { filterData } from "../utils/filterData";
import API from "../lib/axios";
import { toast } from "react-hot-toast";
import { useLanguage } from "../contexts/LanguageContext";

const ScrapMaintenanceApproval = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: "",
  });

  // Define columns from translations on each render so they react to language changes
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
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setIsLoading(true);
    try {
      const res = await API.get("/scrap-maintenance/approvals");
      const approvals = res.data?.approvals || [];

      const formatted = approvals.map((row) => {
        // Format the display name based on whether it's individual asset or group
        let displayName = row.asset_group_name;
        
        // If it's an individual asset (SCRAP_INDIVIDUAL_* or SCRAP_SALES_*), show only asset name
        if (row.assetgroup_id && (row.assetgroup_id.startsWith('SCRAP_INDIVIDUAL_') || row.assetgroup_id.startsWith('SCRAP_SALES_'))) {
          displayName = row.asset_names || row.asset_group_name;
        } else if (row.asset_names) {
          // For real groups, show group name followed by asset names in parentheses
          displayName = `${row.asset_group_name} (${row.asset_names})`;
        }

        return {
          ...row,
          status: row.header_status,
          created_on: row.created_on ? new Date(row.created_on).toLocaleDateString() : "",
          scrap_type_display: row.is_scrap_sales === "Y"
            ? t('scrapApproval.scrapTypeOptions.sales')
            : t('scrapApproval.scrapTypeOptions.asset'),
          display_name: displayName,
        };
      });

      setData(formatted);
    } catch (err) {
      console.error("Failed to fetch scrap approvals", err);
      toast.error(t('scrapApproval.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

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

          if (isLoading) {
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

