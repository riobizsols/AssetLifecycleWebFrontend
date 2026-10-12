import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  History,
  PackagePlus,
  PackageX,
  Plus,
  RefreshCcw,
  TrendingDown,
} from 'lucide-react';
import { utilityPrimaryBtn } from '../utility/UtilityUi';
import InventoryForm from '../../components/consumables/InventoryForm';
import InventoryTable from '../../components/consumables/InventoryTable';
import StockHistoryDrawer from '../../components/consumables/StockHistoryDrawer';
import { ToolbarSelect } from '../../components/consumables/ConsumablesDataTable';
import { ConfirmDeleteDialog, ConsumablesPage, StatCard } from '../../components/consumables/ConsumablesUi';
import { STOCK_STATUS } from '../../components/consumables/stockStatus';
import { consumableService } from '../../services/consumableService';
import { useConsumablesData, useCrudEditor } from '../../hooks/useConsumablesData';
import { useNavigation } from '../../hooks/useNavigation';

const initialData = { inventory: [], consumables: [] };

export default function ConsumablesInventory() {
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess('CONSUMABLESINVENTORY');

  const { data, loading, reload } = useConsumablesData(
    {
      inventory: () => consumableService.listInventory(),
      consumables: consumableService.listConsumables,
    },
    initialData,
  );

  const editor = useCrudEditor({
    idKey: 'cinven_id',
    noun: 'Stock entry',
    create: consumableService.createInventory,
    update: consumableService.updateInventory,
    remove: consumableService.deleteInventory,
    reload,
  });

  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [historyRow, setHistoryRow] = useState(null);

  const counts = useMemo(() => {
    const c = { OUT_OF_STOCK: 0, REORDER: 0, LOW_STOCK: 0, OK: 0 };
    data.inventory.forEach((r) => {
      c[r.stock_status] = (c[r.stock_status] || 0) + 1;
    });
    return c;
  }, [data.inventory]);

  const branchOptions = useMemo(() => {
    const map = new Map();
    data.inventory.forEach((r) => r.branch_id && map.set(r.branch_id, r.branch_name || r.branch_id));
    return [...map.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  }, [data.inventory]);

  const rows = useMemo(
    () =>
      data.inventory.filter(
        (r) =>
          (!statusFilter || r.stock_status === statusFilter) &&
          (!branchFilter || r.branch_id === branchFilter),
      ),
    [data.inventory, statusFilter, branchFilter],
  );

  const toggleStatus = (value) => setStatusFilter((prev) => (prev === value ? '' : value));
  const clearFilters = () => {
    setStatusFilter('');
    setBranchFilter('');
  };

  return (
    <ConsumablesPage
      icon={Boxes}
      title="Consumables inventory"
      subtitle="Stock on hand, thresholds and items that need attention."
      loading={loading}
      actions={
        <>
          <button
            type="button"
            onClick={() => reload()}
            title="Refresh"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#C9D5E3] bg-white text-[#0E2F4B] hover:bg-[#F3F6F9]"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
          {canEdit ? (
            <button type="button" onClick={editor.startAdd} className={utilityPrimaryBtn}>
              <Plus className="h-4 w-4" /> Add stock
            </button>
          ) : null}
        </>
      }
      stats={
        <>
          <StatCard
            icon={Boxes}
            label="Stock entries"
            value={data.inventory.length}
            hint={`${counts.OK} in stock`}
            active={!statusFilter}
            onClick={() => setStatusFilter('')}
          />
          <StatCard
            icon={AlertTriangle}
            label="Reorder"
            value={counts.REORDER}
            hint="At or below reorder level"
            tone="orange"
            active={statusFilter === 'REORDER'}
            onClick={() => toggleStatus('REORDER')}
          />
          <StatCard
            icon={TrendingDown}
            label="Low stock"
            value={counts.LOW_STOCK}
            hint="At or below min stock"
            tone="amber"
            active={statusFilter === 'LOW_STOCK'}
            onClick={() => toggleStatus('LOW_STOCK')}
          />
          <StatCard
            icon={PackageX}
            label="Out of stock"
            value={counts.OUT_OF_STOCK}
            hint="Quantity is zero"
            tone="rose"
            active={statusFilter === 'OUT_OF_STOCK'}
            onClick={() => toggleStatus('OUT_OF_STOCK')}
          />
        </>
      }
    >
      <InventoryTable
        rows={rows}
        canEdit={canEdit}
        onEdit={editor.startEdit}
        onDelete={(row) =>
          editor.confirmDelete(row, `${row.consumable}${row.brand ? ` (${row.brand})` : ''}`)
        }
        rowActions={(row) => (
          <>
            {canEdit ? (
              <button
                type="button"
                onClick={() => editor.startAdd({ consum_id: row.consum_id, brand: row.brand || '' })}
                title="Restock"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
              >
                <PackagePlus className="h-4 w-4" /> Restock
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setHistoryRow(row)}
              title="Stock history"
              aria-label="Stock history"
              className="rounded-md p-1.5 text-[#33506B] hover:bg-[#E8EFF6] hover:text-[#0E2F4B]"
            >
              <History className="h-4 w-4" />
            </button>
          </>
        )}
        filtersActive={!!(statusFilter || branchFilter)}
        resetKey={`${statusFilter}|${branchFilter}`}
        onClearFilters={clearFilters}
        filters={
          <>
            <ToolbarSelect value={statusFilter} onChange={setStatusFilter} label="Filter by status">
              <option value="">All statuses</option>
              {Object.entries(STOCK_STATUS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </ToolbarSelect>
            {branchOptions.length > 1 ? (
              <ToolbarSelect value={branchFilter} onChange={setBranchFilter} label="Filter by branch">
                <option value="">All branches</option>
                {branchOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </ToolbarSelect>
            ) : null}
          </>
        }
        emptyAction={
          canEdit ? (
            <button type="button" onClick={editor.startAdd} className={`${utilityPrimaryBtn} mt-1`}>
              <Plus className="h-4 w-4" /> Add stock
            </button>
          ) : null
        }
      />

      {editor.editing ? (
        <InventoryForm
          key={editor.editing.cinven_id || 'new'}
          initial={editor.editing}
          consumables={data.consumables}
          inventory={data.inventory}
          saving={editor.saving}
          onSubmit={editor.save}
          onCancel={editor.cancel}
        />
      ) : null}

      {historyRow ? <StockHistoryDrawer row={historyRow} onClose={() => setHistoryRow(null)} /> : null}

      <ConfirmDeleteDialog
        open={!!editor.pendingDelete}
        title="Delete stock entry"
        message={
          <>
            Delete stock for <strong className="text-[#0E2F4B]">{editor.pendingDelete?.description}</strong>?
            Entries with allocations can&apos;t be deleted.
          </>
        }
        busy={editor.deleting}
        onCancel={editor.cancelDelete}
        onConfirm={editor.performDelete}
      />
    </ConsumablesPage>
  );
}
