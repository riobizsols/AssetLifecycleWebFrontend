import { showBackendTextToast } from '../utils/errorTranslation';
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import API from "../lib/axios";
import { toast } from "react-hot-toast";
import { Plus } from "lucide-react";
import ContentBox from "../components/ContentBox";
import CustomTable from "../components/CustomTable";
import { useAuditLog } from "../hooks/useAuditLog";
import { GROUP_ASSETS_APP_ID } from "../constants/groupAssetsAuditEvents";
import { useLanguage } from "../contexts/LanguageContext";
import { useRevalidateOnFocus } from "../hooks/useRevalidateOnFocus";
import { useGroupAssetStore } from "../store/useGroupAssetStore";
import { invalidateCache } from "../utils/apiCache";
import { filterData } from "../utils/filterData";
import { applyListFilterChange, hasActiveListFilters, EMPTY_LIST_FILTERS } from "../utils/listFilterState";

const GroupAsset = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const groupAssets = useGroupAssetStore((s) => s.groupAssets);
  const listLoading = useGroupAssetStore((s) => s.listLoading);
  const fetchGroupAssetsStore = useGroupAssetStore((s) => s.fetchGroupAssets);
  const removeGroups = useGroupAssetStore((s) => s.removeGroups);
  const loading = listLoading && groupAssets.length === 0;

  // Audit logging
  const { recordActionByNameWithFetch } = useAuditLog(GROUP_ASSETS_APP_ID);

  const fetchAssetGroups = async ({ force = false } = {}) => {
    try {
      await fetchGroupAssetsStore({ revalidate: true, force });
    } catch (error) {
      console.error("Error fetching asset groups:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_GROUPASSETS_FAILEDTOFETCHASSETGROUPS_25C4A6EA', fallbackText: t("groupAssets.failedToFetchAssetGroups"), type: 'error' });
    }
  };

  useEffect(() => {
    fetchAssetGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRevalidateOnFocus(() => {
    fetchGroupAssetsStore({ revalidate: true });
  });

  const columns = [
    {
      key: "group_id",
      name: "group_id",
      label: t("groupAssets.groupId"),
      sortable: true,
      visible: true,
    },
    {
      key: "group_name",
      name: "group_name",
      label: t("groupAssets.groupName"),
      sortable: true,
      visible: true,
    },
    {
      key: "org_id",
      name: "org_id",
      label: t("groupAssets.organization"),
      sortable: true,
      visible: true,
    },
    {
      key: "asset_count",
      name: "asset_count",
      label: t("groupAssets.assetCount"),
      sortable: true,
      visible: true,
    },
    {
      key: "created_by",
      name: "created_by",
      label: t("groupAssets.createdBy"),
      sortable: true,
      visible: true,
    },
    {
      key: "created_date",
      name: "created_date",
      label: t("groupAssets.createdDate"),
      sortable: true,
      visible: true,
    },
    {
      key: "changed_by",
      name: "changed_by",
      label: t("groupAssets.modifiedBy"),
      sortable: true,
      visible: true,
    },
    {
      key: "changed_date",
      name: "changed_date",
      label: t("groupAssets.modifiedDate"),
      sortable: true,
      visible: true,
    },
    {
      key: "status",
      name: "status",
      label: t("groupAssets.status"),
      sortable: true,
      visible: true,
    },
  ];

  const handleAddGroupAsset = async () => {
    // Log audit event for opening create form
    await recordActionByNameWithFetch("Create", {
      action: "Add Group Asset Form Opened",
    });
    navigate("/group-asset/create");
  };

  const handleView = (row) => {
    // Navigate to view page
    navigate(`/group-asset/view/${row.group_id}`);
  };

  const handleEdit = (row) => {
    // Navigate to edit page with group data
    navigate(`/group-asset/edit/${row.group_id}`, {
      state: {
        groupData: row,
        isEdit: true,
      },
    });
  };

  const handleDelete = async (row) => {
    try {
      await API.delete(`/asset-groups/${row.group_id}`);

      // Log audit event for delete
      await recordActionByNameWithFetch("Delete", {
        groupId: row.group_id,
        groupName: row.group_name,
        action: "Group Asset Deleted Successfully",
      });

      showBackendTextToast({ toast, tmdId: 'TMD_I18N_GROUPASSETS_ASSETGROUPDELETEDSUCCESSFULLY_32EB5DF7', fallbackText: t("groupAssets.assetGroupDeletedSuccessfully"), type: 'success' });
      removeGroups([row.group_id]);
      invalidateCache('asset-groups:');
      fetchAssetGroups({ force: true });
    } catch (error) {
      console.error("Error deleting asset group:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_GROUPASSETS_FAILEDTODELETEASSETGROUP_59E22566', fallbackText: t("groupAssets.failedToDeleteAssetGroup"), type: 'error' });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_GROUPASSETS_PLEASESELECTASSETGROUPSTODELETE_4A5C073C', fallbackText: t("groupAssets.pleaseSelectAssetGroupsToDelete"), type: 'error' });
      return;
    }

    try {
      // Delete each selected asset group
      const deletePromises = selectedRows.map((rowId) =>
        API.delete(`/asset-groups/${rowId}`),
      );

      await Promise.all(deletePromises);

      // Log audit event for bulk delete
      await recordActionByNameWithFetch("Delete", {
        groupIds: selectedRows,
        count: selectedRows.length,
        action: "Multiple Group Assets Deleted Successfully",
      });

      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_GROUPASSETS_ASSETGROUPSDELETEDSUCCESSFULLY_23CAB444',
        fallbackText: t("groupAssets.assetGroupsDeletedSuccessfully", {
          count: selectedRows.length,
        }),
        type: 'success',
      });

      // Clear selection and refresh data
      setSelectedRows([]);
      removeGroups(selectedRows);
      invalidateCache('asset-groups:');
      fetchAssetGroups({ force: true });
    } catch (error) {
      console.error("Error deleting selected asset groups:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_GROUPASSETS_FAILEDTODELETESOMEASSETGROUPS_781931A5', fallbackText: t("groupAssets.failedToDeleteSomeAssetGroups"), type: 'error' });
    }
  };

  const [selectedRows, setSelectedRows] = useState([]);
  const [filterValues, setFilterValues] = useState({
    columnFilters: [],
    fromDate: "",
    toDate: "",
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const handleSort = (column) => {
    setSortConfig((prev) => ({
      key: column,
      direction:
        prev.key === column && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortData = (data) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const handleFilterChange = (columnName, value) => {
    setFilterValues((prev) => applyListFilterChange(prev, columnName, value));
  };

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options:
      col.name === "status"
        ? [
            { label: t("groupAssets.active"), value: "Active" },
            { label: t("groupAssets.inactive"), value: "Inactive" },
          ]
        : [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  return (
    <div className="p-4">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {t("groupAssets.loadingAssetGroups")}
            </p>
          </div>
        </div>
      ) : (
        <ContentBox
          filters={filters}
          dateFilterField="created_date"
          onFilterChange={handleFilterChange}
          onSort={handleSort}
          sortConfig={sortConfig}
          onAdd={handleAddGroupAsset}
          onDeleteSelected={handleDeleteSelected}
          data={groupAssets}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          rowKey="group_id"
          subtitle={t("groupAssets.assetGroupsFound", {
            count: groupAssets.length,
          })}
        >
          {({ visibleColumns }) => {
            const filteredData = filterData(
              groupAssets,
              filterValues,
              visibleColumns,
            );
            const sortedData = sortData(filteredData);
            const visibleCols = visibleColumns.filter((col) => col.visible);
            const emptyColSpan = visibleCols.length + 1;

            if (filteredData.length === 0 && hasActiveListFilters(filterValues)) {
              return (
                <tr>
                  <td colSpan={emptyColSpan} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-gray-500">
                        {t("groupAssets.noAssetGroupsMatchFilters")}
                      </p>
                      <button
                        onClick={() => setFilterValues({ ...EMPTY_LIST_FILTERS })}
                        className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
                      >
                        {t("groupAssets.clearAllFilters")}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }

            if (sortedData.length === 0) {
              return (
                <tr>
                  <td colSpan={emptyColSpan} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-xl font-semibold text-gray-800 mb-2">
                        {t("groupAssets.noAssetGroupsFound")}
                      </p>
                      <button
                        onClick={handleAddGroupAsset}
                        className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
                      >
                        {t("groupAssets.createYourFirstAssetGroup")}
                      </button>
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
                rowKey="group_id"
              />
            );
          }}
        </ContentBox>
      )}
    </div>
  );
};

export default GroupAsset;
