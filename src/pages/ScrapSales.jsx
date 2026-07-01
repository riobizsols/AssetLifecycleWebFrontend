import { showBackendTextToast } from '../utils/errorTranslation';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';
import ContentBox from '../components/ContentBox';
import CustomTable from '../components/CustomTable';
import { useLanguage } from '../contexts/LanguageContext';
import { useRevalidateOnFocus } from '../hooks/useRevalidateOnFocus';
import { useScrapSalesStore } from '../store/useScrapSalesStore';
import { invalidateCache } from '../utils/apiCache';
import { filterData } from '../utils/filterData';
import { applyListFilterChange } from '../utils/listFilterState';

const ScrapSales = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const scrapSales = useScrapSalesStore((s) => s.scrapSales);
  const listLoading = useScrapSalesStore((s) => s.listLoading);
  const fetchScrapSalesStore = useScrapSalesStore((s) => s.fetchScrapSales);
  const removeSales = useScrapSalesStore((s) => s.removeSales);

  const loading = listLoading && scrapSales.length === 0;

  const loadScrapSales = async ({ force = false } = {}) => {
    try {
      await fetchScrapSalesStore({ revalidate: true, force });
    } catch (error) {
      console.error(t('scrapSales.failedToFetchScrapSales'), error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_SCRAPSALES_FAILEDTOLOADSCRAPSALES_690537D0', fallbackText: t('scrapSales.failedToLoadScrapSales'), type: 'error' });
    }
  };

  useEffect(() => {
    loadScrapSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRevalidateOnFocus(() => {
    fetchScrapSalesStore({ revalidate: true });
  });

  const columns = [
    { key: 'ssh_id', name: 'ssh_id', label: t('scrapSales.saleId'), sortable: true, visible: true },
    { key: 'text', name: 'text', label: t('scrapSales.saleTitle'), sortable: true, visible: true },
    { key: 'status', name: 'status', label: t('scrapSales.status'), sortable: true, visible: true },
    { key: 'buyer_name', name: 'buyer_name', label: t('scrapSales.buyerName'), sortable: true, visible: true },
    { key: 'buyer_company', name: 'buyer_company', label: t('scrapSales.buyerCompany'), sortable: true, visible: true },
    { key: 'buyer_phone', name: 'buyer_phone', label: t('scrapSales.buyerPhone'), sortable: true, visible: true },
    { key: 'sale_date', name: 'sale_date', label: t('scrapSales.saleDate'), sortable: true, visible: true },
    { key: 'collection_date', name: 'collection_date', label: t('scrapSales.collectionDate'), sortable: true, visible: true },
    { key: 'invoice_no', name: 'invoice_no', label: t('scrapSales.invoiceNo'), sortable: true, visible: true },
    { key: 'po_no', name: 'po_no', label: t('scrapSales.poNo'), sortable: true, visible: true },
    { key: 'total_assets', name: 'total_assets', label: t('scrapSales.totalAssets'), sortable: true, visible: true },
    { key: 'total_sale_value', name: 'total_sale_value', label: t('scrapSales.totalSaleValue'), sortable: true, visible: true },
    { key: 'created_by', name: 'created_by', label: t('scrapSales.createdBy'), sortable: true, visible: true },
    { key: 'created_on', name: 'created_on', label: t('scrapSales.createdOn'), sortable: true, visible: true }
  ];

  const handleAddScrapSale = () => {
    navigate('/scrap-sales/create');
  };

  const handleView = (row) => {
    // Navigate to view page
    navigate(`/scrap-sales/view/${row.ssh_id}`);
  };

  const handleEdit = (row) => {
    // Transform the data to match the expected structure in EditScrapSales
    const transformedData = {
      scrap_id: row.ssh_id,
      group_name: row.group_name,
      selected_assets: [
        {
          asset_id: row.asset_id,
          name: row.asset_name,
          description: `${row.asset_type} - ${row.asset_name}`,
          purchased_on: row.created_date,
          asset_type_id: row.asset_type === 'Laptop' ? 'AT001' : 
                        row.asset_type === 'Desktop' ? 'AT002' : 
                        row.asset_type === 'Monitor' ? 'AT003' : 'AT001',
          asset_type_name: row.asset_type,
          serial_number: `SN${row.asset_id}`,
          scrap_value: row.scrap_value
        }
      ],
      total_scrap_value: row.scrap_value,
      buyer_details: {
        buyer_name: row.buyer_name,
        buyer_email: row.buyer_contact,
        buyer_contact: row.buyer_contact,
        company_name: 'Company Name' // Default value since not in original data
      },
      status: row.status
    };

    // Navigate to edit page with scrap sale data
    navigate(`/scrap-sales/edit/${row.ssh_id}`, { 
      state: { 
        scrapData: transformedData,
        isEdit: true 
      } 
    });
  };

  const handleDelete = async (row) => {
    try {
      console.log('Deleting scrap sale:', row);
      
      const response = await API.delete(`/scrap-sales/${row.ssh_id}`, {
        params: { context: 'SCRAPSALES' }
      });
      
      if (response.data.success) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_SCRAPSALES_SCRAPSALEDELETEDSUCCESSFULLY_681E7681',
          fallbackText: t('scrapSales.scrapSaleDeletedSuccessfully'),
          type: 'success',
        });
        removeSales([row.ssh_id]);
        invalidateCache('scrap-sales:');
      } else {
        throw new Error(response.data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting scrap sale:', error);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_SCRAPSALES_ERRORDELETINGSCRAPSALE_7E3B6D31',
        fallbackText: error.response?.data?.message || t('scrapSales.errorDeletingScrapSale'),
        type: 'error',
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedRows || selectedRows.length === 0) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_SCRAPSALES_PLEASESELECTSCRAPSALESTODELETE_1E4D8AAF',
        fallbackText: t('scrapSales.pleaseSelectScrapSalesToDelete'),
        type: 'error',
      });
      return false; // Return false to keep modal open
    }
    
    try {
      console.log('Deleting selected scrap sales:', selectedRows);
      
      // Delete each scrap sale individually
      const deletePromises = selectedRows.map(sshId => 
        API.delete(`/scrap-sales/${sshId}`, {
          params: { context: 'SCRAPSALES' }
        })
      );
      
      const results = await Promise.allSettled(deletePromises);
      
      // Count successful and failed deletions
      const successful = results.filter(result => result.status === 'fulfilled' && result.value.data.success).length;
      const failed = results.length - successful;
      
      if (successful > 0) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_SCRAPSALES_SCRAPSALESDELETEDSUCCESSFULLY_4D654472',
          fallbackText: t('scrapSales.scrapSalesDeletedSuccessfully', { count: successful }),
          type: 'success',
        });

        const deletedIds = selectedRows.filter((_, i) =>
          results[i].status === 'fulfilled' && results[i].value.data.success
        );
        removeSales(deletedIds);
        invalidateCache('scrap-sales:');
        setSelectedRows([]);
      }
      
      if (failed > 0) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_SCRAPSALES_ERRORDELETINGSCRAPSALESCOUNT_65224FA7',
          fallbackText: t('scrapSales.errorDeletingScrapSales', { count: failed }),
          type: 'error',
        });
      }
      
      return true; // Return true to close modal
    } catch (error) {
      console.error('Error deleting scrap sales:', error);
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_SCRAPSALES_ERRORDELETINGSCRAPSALES_31497D1F',
        fallbackText: t('scrapSales.errorDeletingScrapSales'),
        type: 'error',
      });
      return false; // Return false to keep modal open
    }
  };



  const [selectedRows, setSelectedRows] = useState([]);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: '',
    toDate: '',
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (column) => {
    setSortConfig(prev => ({
      key: column,
      direction: prev.key === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortData = (data) => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleFilterChange = (columnName, value) => {
    setFilterValues((prev) => applyListFilterChange(prev, columnName, value));
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: col.name === 'status' ? [
      { label: t('scrapSales.completed'), value: "Completed" },
      { label: t('scrapSales.pending'), value: "Pending" },
      { label: t('scrapSales.cancelled'), value: "Cancelled" }
    ] : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  return (
    <div className="p-4">
      <ContentBox
        filters={filters}
        dateFilterField="sale_date"
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
        onAdd={handleAddScrapSale}
        onDeleteSelected={handleDeleteSelected}
        data={scrapSales}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        rowKey="ssh_id"
      >
        {({ visibleColumns }) => {
          const filteredData = filterData(scrapSales, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);

          if (!loading && sortedData.length === 0) {
            const visibleCols = visibleColumns.filter((col) => col.visible);
            const colSpan = visibleCols.length + 1; // +1 for actions column
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-xl font-semibold text-gray-800">
                      {t('scrapSales.noScrapSalesFound')}
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
                             onView={handleView}
               onEdit={handleEdit}
               onDelete={handleDelete}
              rowKey="ssh_id"
            />
          );
        }}
      </ContentBox>

      
    </div>
  );
};

export default ScrapSales; 