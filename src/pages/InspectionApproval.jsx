import { useEffect, useState } from "react";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import { filterData } from "../utils/filterData";
import { exportToExcel } from "../utils/exportToExcel";
import { useNavigate } from "react-router-dom";
import API from "../lib/axios";
import { toast } from "react-hot-toast";
import StatusBadge from "../components/StatusBadge";
import { useLanguage } from "../contexts/LanguageContext";

const InspectionApproval = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: ""
  });
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    sorts: []
  });

  // Use state for columns to prevent re-creation on every render
  const [columns] = useState([
    { label: t('inspectionApproval.assetCode'), name: "asset_code", visible: true },
    { label: t('inspectionApproval.assetType'), name: "asset_type_name", visible: true },
    { label: t('inspectionApproval.serialNumber'), name: "serial_number", visible: true },
    { label: t('inspectionApproval.scheduledDate'), name: "pl_sch_date", visible: true },
    { label: t('inspectionApproval.status'), name: "header_status", visible: true },
    { label: t('inspectionApproval.branch'), name: "branch_name", visible: true },
    { label: t('inspectionApproval.jobRole'), name: "job_role_name", visible: true },
  ]);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setIsLoading(true);
    try {
      const res = await API.get("/inspection-approval/pending");
      
      if (res.data.success) {
        const approvalData = res.data.data.map(item => ({
            ...item,
            id: item.wfaiisd_id, // Use workflow detail ID as row key
            pl_sch_date: item.pl_sch_date ? new Date(item.pl_sch_date).toLocaleDateString() : '-',
            header_status: item.header_status || 'PN'
        }));
        setData(approvalData);
      }
    } catch (err) {
      console.error("Failed to fetch inspection approvals", err);
      toast.error(t('inspectionApproval.failedToFetch'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (columnName, value) => {
    if (columnName === "columnFilters") {
      setFilterValues((prev) => ({ ...prev, columnFilters: value }));
    } else if (columnName === "fromDate" || columnName === "toDate") {
      setFilterValues((prev) => ({ ...prev, [columnName]: value }));
    } else {
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
    }
  };

  const handleSort = (column) => {
    setSortConfig((prev) => {
      const sorts = [...prev.sorts];
      const existingSort = sorts.find((s) => s.column === column);
      if (existingSort) {
        if (existingSort.direction === "asc") {
          existingSort.direction = "desc";
        } else {
          sorts.splice(sorts.indexOf(existingSort), 1);
        }
      } else {
        sorts.push({ column, direction: "asc" });
      }
      return { sorts };
    });
  };

  const sortData = (data) => {
    if (!sortConfig.sorts.length) return data;
    return [...data].sort((a, b) => {
      for (const sort of sortConfig.sorts) {
        const aValue = a[sort.column];
        const bValue = b[sort.column];
        if (aValue < bValue) return sort.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sort.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  const handleRowClick = (item) => {
    navigate(`/inspection-approval-detail/${item.wfaiish_id}`);
  };
  
  const handleDownload = () => {
      const filteredData = filterData(data, filterValues, columns);
      const dataToExport = sortData(filteredData);
      exportToExcel(dataToExport, columns, "Inspection_Approvals");
      toast.success(t('common.exportSuccess'));
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: col.name === 'header_status' ? [
        { label: 'Initiated', value: 'IN' },
        { label: 'Pending', value: 'PN' },
        { label: 'Approved', value: 'AP' },
        { label: 'Rejected', value: 'RJ' },
        { label: 'Completed', value: 'CO' }
    ] : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        onDownload={handleDownload}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={false} 
        showActions={false}
      >
        {({ visibleColumns, showActions }) => {
          const filteredData = filterData(data, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);
          
          if (isLoading) {
              const visibleCols = visibleColumns.filter((col) => col.visible);
              const colSpan = visibleCols.length + (showActions ? 1 : 0);
              return (
                  <tr>
                      <td colSpan={colSpan} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center">
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                              <p className="text-gray-600">{t('common.loading')}</p>
                          </div>
                      </td>
                  </tr>
              );
          }
          
          if (sortedData.length === 0) {
              const visibleCols = visibleColumns.filter((col) => col.visible);
              const colSpan = visibleCols.length + (showActions ? 1 : 0);
              return (
                  <tr>
                    <td colSpan={colSpan} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-xl font-semibold text-gray-800">
                          {t('common.noDataFound')}
                        </p>
                      </div>
                    </td>
                  </tr>
              );
          }

          return (
            <CustomTable
                columns={visibleColumns}
                visibleColumns={visibleColumns}
                data={sortedData}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                rowKey="id"
                showActions={showActions}
                onRowClick={handleRowClick}
                renderCell={(col, row) => 
                     col.name === "header_status" ? <StatusBadge status={row[col.name]} /> : row[col.name]
                }
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default InspectionApproval;
