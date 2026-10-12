import React, { useMemo, useState } from 'react';
import { Layers, Package, PackageCheck, PackageX, Plus, Ruler } from 'lucide-react';
import { utilityPrimaryBtn } from '../utility/UtilityUi';
import ConsumableForm from '../../components/consumables/ConsumableForm';
import ConsumablesTable from '../../components/consumables/ConsumablesTable';
import { ToolbarSelect } from '../../components/consumables/ConsumablesDataTable';
import { ConfirmDeleteDialog, ConsumablesPage, StatCard } from '../../components/consumables/ConsumablesUi';
import { consumableService } from '../../services/consumableService';
import { useConsumablesData, useCrudEditor } from '../../hooks/useConsumablesData';
import { useNavigation } from '../../hooks/useNavigation';

const initialData = { items: [], lookups: { uoms: [], branches: [], departments: [] } };

export default function ConsumablesMaster() {
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess('CONSUMABLESMASTER');

  const { data, loading, reload } = useConsumablesData(
    { items: consumableService.listConsumables, lookups: consumableService.getLookups },
    initialData,
  );

  const editor = useCrudEditor({
    idKey: 'consum_id',
    noun: 'Consumable',
    create: consumableService.createConsumable,
    update: consumableService.updateConsumable,
    remove: consumableService.deleteConsumable,
    reload,
  });

  const [stockFilter, setStockFilter] = useState('');
  const [uomFilter, setUomFilter] = useState('');

  const stats = useMemo(() => {
    const withStock = data.items.filter((i) => Number(i.inventory_count) > 0).length;
    return {
      total: data.items.length,
      withStock,
      withoutStock: data.items.length - withStock,
      uoms: new Set(data.items.map((i) => i.uom_id).filter(Boolean)).size,
    };
  }, [data.items]);

  const uomOptions = useMemo(() => {
    const map = new Map();
    data.items.forEach((i) => i.uom_id && map.set(i.uom_id, i.uom_name || i.uom_id));
    return [...map.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  }, [data.items]);

  const rows = useMemo(
    () =>
      data.items.filter((i) => {
        if (uomFilter && i.uom_id !== uomFilter) return false;
        if (stockFilter === 'with') return Number(i.inventory_count) > 0;
        if (stockFilter === 'without') return !(Number(i.inventory_count) > 0);
        return true;
      }),
    [data.items, uomFilter, stockFilter],
  );

  const toggleStock = (value) => setStockFilter((prev) => (prev === value ? '' : value));
  const clearFilters = () => {
    setStockFilter('');
    setUomFilter('');
  };

  return (
    <ConsumablesPage
      icon={Package}
      title="Consumables"
      loading={loading}
      actions={
        canEdit ? (
          <button type="button" onClick={editor.startAdd} className={utilityPrimaryBtn}>
            <Plus className="h-4 w-4" /> Add consumable
          </button>
        ) : null
      }
      stats={
        <>
          <StatCard
            icon={Layers}
            label="Total items"
            value={stats.total}
            active={!stockFilter}
            onClick={() => setStockFilter('')}
          />
          <StatCard
            icon={PackageCheck}
            label="With stock"
            value={stats.withStock}
            hint="Have at least one stock entry"
            tone="emerald"
            active={stockFilter === 'with'}
            onClick={() => toggleStock('with')}
          />
          <StatCard
            icon={PackageX}
            label="No stock entries"
            value={stats.withoutStock}
            hint="Not yet added to inventory"
            tone="amber"
            active={stockFilter === 'without'}
            onClick={() => toggleStock('without')}
          />
          <StatCard icon={Ruler} label="Units in use" value={stats.uoms} tone="violet" />
        </>
      }
    >
      <ConsumablesTable
        rows={rows}
        canEdit={canEdit}
        onEdit={editor.startEdit}
        onDelete={(row) => editor.confirmDelete(row, row.consumable)}
        filtersActive={!!(stockFilter || uomFilter)}
        resetKey={`${stockFilter}|${uomFilter}`}
        onClearFilters={clearFilters}
        filters={
          <ToolbarSelect value={uomFilter} onChange={setUomFilter} label="Filter by UOM">
            <option value="">All UOMs</option>
            {uomOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </ToolbarSelect>
        }
        emptyAction={
          canEdit ? (
            <button type="button" onClick={editor.startAdd} className={`${utilityPrimaryBtn} mt-1`}>
              <Plus className="h-4 w-4" /> Add consumable
            </button>
          ) : null
        }
      />

      {editor.editing ? (
        <ConsumableForm
          key={editor.editing.consum_id || 'new'}
          initial={editor.editing}
          lookups={data.lookups}
          saving={editor.saving}
          onSubmit={editor.save}
          onCancel={editor.cancel}
        />
      ) : null}

      <ConfirmDeleteDialog
        open={!!editor.pendingDelete}
        title="Delete consumable"
        message={
          <>
            Delete <strong className="text-[#0E2F4B]">{editor.pendingDelete?.description}</strong>? Items with
            stock entries can&apos;t be deleted until those entries are removed.
          </>
        }
        busy={editor.deleting}
        onCancel={editor.cancelDelete}
        onConfirm={editor.performDelete}
      />
    </ConsumablesPage>
  );
}
