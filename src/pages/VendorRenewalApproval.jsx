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

const VendorRenewalApproval = () => {
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

  const [columns] = useState([
    { label: t('vendorRenewalApproval.vendorName'), name: "vendor_name", visible: true },
    { label: t('vendorRenewalApproval.companyName'), name: "company_name", visible: true },
    { label: t('vendorRenewalApproval.contactPerson'), name: "contact_person_name", visible: true },
    { label: t('vendorRenewalApproval.scheduledDate'), name: "scheduled_date", visible: true },
    { label: t('vendorRenewalApproval.maintenanceType'), name: "maintenance_type", visible: true },
    { label: t('vendorRenewalApproval.status'), name: "status", visible: true },
    { label: t('vendorRenewalApproval.daysUntilDue'), name: "days_until_due", visible: true },
  ]);

  useEffect(() => {
    fetchVendorRenewalApprovals();
  }, []);

  const fetchVendorRenewalApprovals = async () => {
    setIsLoading(true);
    try {
      const res = await API.get("/approval-detail/vendor-renewal-approvals");
      const approvalsArray = Array.isArray(res.data) ? res.data : res.data.data || [];
      const formattedData = approvalsArray.map(item => {
        const formatDate = (dateString) => {
          if (!dateString) return '';
          try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleDateString();
          } catch (err) {
            console.error('Error formatting date:', err);
            return '';
          }
        };

        return {
          ...item,
          scheduled_date: formatDate(item.scheduled_date),
          actual_date: formatDate(item.actual_date),
          maintenance_created_on: formatDate(item.maintenance_created_on),
          maintenance_changed_on: formatDate(item.maintenance_changed_on),
          days_until_due: item.days_until_due ? `${item.days_until_due} ${t('vendorRenewalApproval.days')}` : '-',
          // Add urgency styling for days until due
          urgency_class: item.days_until_due <= 2 ? 'text-red-600 font-semibold' : 
                        item.days_until_due <= 5 ? 'text-orange-600 font-semibold' : 
                        'text-gray-600'
        };
      });
      setData(formattedData);
    } catch (err) {
      console.error("Failed to fetch vendor renewal approvals", err);
      toast.error(t('vendorRenewalApproval.failedToFetchApprovals'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (columnName, value) => {
    // Handle columnFilters array from ContentBox
    if (columnName === "columnFilters") {
      setFilterValues((prev) => ({
        ...prev,
        columnFilters: value,
      }));
    }
    // Handle date filters
    else if (columnName === "fromDate" || columnName === "toDate") {
      setFilterValues((prev) => ({
        ...prev,
        [columnName]: value,
      }));
    }
    // Handle individual column filters (legacy support)
    else {
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

  const handleDownload = () => {
    try {
      // Get the filtered and sorted data
      const filteredData = filterData(data, filterValues, columns.filter(col => col.visible));
      const dataToExport = sortData(filteredData);

      // Export to Excel
      const success = exportToExcel(
        dataToExport,
        columns,
        'Vendor_Renewal_Approvals_List'
      );

      if (success) {
        toast(
          t('vendorRenewalApproval.approvalsExportedSuccessfully'),
          {
            icon: '✅',
            style: {
              borderRadius: '8px',
              background: '#064E3B',
              color: '#fff',
            },
          }
        );
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast(
        t('vendorRenewalApproval.failedToExportApprovals'),
        {
          icon: '❌',
          style: {
            borderRadius: '8px',
            background: '#7F1D1D',
            color: '#fff',
          },
        }
      );
    }
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

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: col.name === 'status' ? [
      { label: t('vendorRenewalApproval.initiated'), value: "IN" },
      { label: t('vendorRenewalApproval.inProgress'), value: "IP" },
      { label: t('vendorRenewalApproval.completed'), value: "CO" },
      { label: t('vendorRenewalApproval.cancelled'), value: "CA" }
    ] : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  const handleRowClick = (row) => {
    navigate(`/approval-detail/${row.wfamsh_id}?context=VENDORRENEWALAPPROVAL`, {
      state: { context: 'VENDORRENEWALAPPROVAL' }
    });
  };

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        onAdd={() => {}}
        onDeleteSelected={() => {}}
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
              rowKey="wfamsh_id"
              showActions={showActions}
              renderCell={(col, row, colIndex) =>
                col.name === "status"
                  ? <StatusBadge status={row[col.name]} />
                  : col.name === "days_until_due"
                  ? <span className={row.urgency_class}>{row[col.name]}</span>
                  : colIndex === 0
                    ? <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row["wfamsh_id"])}
                          onChange={() => setSelectedRows(prev => prev.includes(row["wfamsh_id"]) ? prev.filter(id => id !== row["wfamsh_id"]) : [...prev, row["wfamsh_id"]])}
                          className="accent-yellow-400"
                        />
                        {row[col.name]}
                      </div>
                    : row[col.name]
              }
              onRowClick={handleRowClick}
            />
          );
        }}
      </ContentBox>
    </div>
  );
};

export default VendorRenewalApproval;
