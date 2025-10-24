import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';
import { Plus } from 'lucide-react';
import ContentBox from '../components/ContentBox';
import CustomTable from '../components/CustomTable';
import { useLanguage } from '../contexts/LanguageContext';


const ScrapSales = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [scrapSales, setScrapSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };


  const fetchScrapSales = async () => {
    try {
      setLoading(true);
      const res = await API.get('/scrap-sales', {
        params: { context: 'SCRAPSALES' }
      });
      const list = Array.isArray(res.data?.scrap_sales)
        ? res.data.scrap_sales
        : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.rows)
            ? res.data.rows
            : Array.isArray(res.data)
              ? res.data
              : [];

      const normalized = list.map(item => ({
        ssh_id: item.ssh_id || item.scrap_id || item.id || '',
        text: item.text || item.group_name || item.name || '',
        buyer_name: item.buyer_name || item.buyer_details?.buyer_name || '',
        buyer_company: item.buyer_company || item.buyer_details?.company_name || '',
        buyer_phone: item.buyer_phone || item.buyer_details?.buyer_contact || '',
        sale_date: formatDate(item.sale_date || item.scrap_date || ''),
        collection_date: formatDate(item.collection_date || ''),
        invoice_no: item.invoice_no || '',
        po_no: item.po_no || '',
        total_assets: item.total_assets || '',
        total_sale_value: Array.isArray(item.total_sale_value) ? (item.total_sale_value[0] ?? '') : (item.total_sale_value ?? ''),
        created_by: item.created_by || '',
        created_on: formatDate(item.created_on || item.created_date || '')
      }));

      setScrapSales(normalized);
    } catch (error) {
      console.error(t('scrapSales.failedToFetchScrapSales'), error);
      toast.error(t('scrapSales.failedToLoadScrapSales'));
      setScrapSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScrapSales();
  }, [t]);

  const columns = [
    { key: 'ssh_id', name: 'ssh_id', label: t('scrapSales.saleId'), sortable: true, visible: true },
    { key: 'text', name: 'text', label: t('scrapSales.saleTitle'), sortable: true, visible: true },
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
        toast.success(t('scrapSales.scrapSaleDeletedSuccessfully'), {
          style: {
            borderRadius: '10px',
            background: '#10B981',
            color: '#fff',
          },
        });
        
        // Refresh the scrap sales list
        fetchScrapSales();
      } else {
        throw new Error(response.data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting scrap sale:', error);
      toast.error(error.response?.data?.message || t('scrapSales.errorDeletingScrapSale'), {
        style: {
          borderRadius: '10px',
          background: '#EF4444',
          color: '#fff',
        },
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedRows || selectedRows.length === 0) {
      toast(t('scrapSales.pleaseSelectScrapSalesToDelete'), {
        icon: '⚠️',
        style: {
          borderRadius: '10px',
          background: '#F59E0B',
          color: '#fff',
        },
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
        toast.success(t('scrapSales.scrapSalesDeletedSuccessfully', { count: successful }), {
          style: {
            borderRadius: '10px',
            background: '#10B981',
            color: '#fff',
          },
        });
        
        // Refresh the scrap sales list
        fetchScrapSales();
        
        // Clear selected rows
        setSelectedRows([]);
      }
      
      if (failed > 0) {
        toast.error(t('scrapSales.errorDeletingScrapSales', { count: failed }), {
          style: {
            borderRadius: '10px',
            background: '#EF4444',
            color: '#fff',
          },
        });
      }
      
      return true; // Return true to close modal
    } catch (error) {
      console.error('Error deleting scrap sales:', error);
      toast.error(t('scrapSales.errorDeletingScrapSales'), {
        style: {
          borderRadius: '10px',
          background: '#EF4444',
          color: '#fff',
        },
      });
      return false; // Return false to keep modal open
    }
  };



  const [selectedRows, setSelectedRows] = useState([]);
  const [filterValues, setFilterValues] = useState({});
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

  const filterData = (data, filters, visibleColumns) => {
    return data.filter(item => {
      return Object.keys(filters).every(key => {
        const filterValue = filters[key];
        if (!filterValue || filterValue === '') return true;
        
        const itemValue = item[key];
        if (itemValue === null || itemValue === undefined) return false;
        
        return itemValue.toString().toLowerCase().includes(filterValue.toString().toLowerCase());
      });
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilterValues(prev => {
      if (filterType === 'columnFilters') {
        return { ...prev, columnFilters: value };
      } else if (filterType === 'fromDate' || filterType === 'toDate') {
        return { ...prev, [filterType]: value };
      } else {
        return { ...prev, [filterType]: value };
      }
    });
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
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortConfig={sortConfig}
                 onAdd={handleAddScrapSale}
        onDeleteSelected={handleDeleteSelected}
        data={scrapSales}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
      >
        {({ visibleColumns }) => {
          const filteredData = filterData(scrapSales, filterValues, visibleColumns);
          const sortedData = sortData(filteredData);

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