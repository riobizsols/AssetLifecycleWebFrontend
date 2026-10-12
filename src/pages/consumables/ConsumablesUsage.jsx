import React, { useMemo, useState } from 'react';
import { Building2, CalendarDays, ClipboardList, Package, Plus, Send } from 'lucide-react';
import { utilityPrimaryBtn } from '../utility/UtilityUi';
import UsageForm from '../../components/consumables/UsageForm';
import UsageTable from '../../components/consumables/UsageTable';
import { ToolbarSelect } from '../../components/consumables/ConsumablesDataTable';
import { ConfirmDeleteDialog, ConsumablesPage, StatCard } from '../../components/consumables/ConsumablesUi';
import { consumableService } from '../../services/consumableService';
import { useConsumablesData, useCrudEditor } from '../../hooks/useConsumablesData';
import { useNavigation } from '../../hooks/useNavigation';

const initialData = { usage: [], inventory: [], lookups: { uoms: [], branches: [], departments: [] } };

const isThisMonth = (value) => {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

const sortedOptions = (rows, idKey, nameKey) => {
  const map = new Map();
  rows.forEach((r) => r[idKey] && map.set(r[idKey], r[nameKey] || r[idKey]));
  return [...map.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
};

export default function ConsumablesUsage() {
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess('CONSUMABLESUSAGE');

  const { data, loading, reload } = useConsumablesData(
    {
      usage: () => consumableService.listUsage(),
      inventory: () => consumableService.listInventory(),
      lookups: consumableService.getLookups,
    },
    initialData,
  );

  const editor = useCrudEditor({
    idKey: 'cusage_id',
    noun: 'Usage',
    create: consumableService.createUsage,
    update: consumableService.updateUsage,
    remove: consumableService.deleteUsage,
    reload,
  });

  const [deptFilter, setDeptFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [monthOnly, setMonthOnly] = useState(false);

  const stats = useMemo(
    () => ({
      total: data.usage.length,
      thisMonth: data.usage.filter((u) => isThisMonth(u.created_on)).length,
      departments: new Set(data.usage.map((u) => u.dept_id).filter(Boolean)).size,
      items: new Set(data.usage.map((u) => u.consum_id).filter(Boolean)).size,
    }),
    [data.usage],
  );

  const deptOptions = useMemo(() => sortedOptions(data.usage, 'dept_id', 'dept_name'), [data.usage]);
  const itemOptions = useMemo(() => sortedOptions(data.usage, 'consum_id', 'consumable'), [data.usage]);

  const rows = useMemo(
    () =>
      data.usage.filter(
        (u) =>
          (!deptFilter || u.dept_id === deptFilter) &&
          (!itemFilter || u.consum_id === itemFilter) &&
          (!monthOnly || isThisMonth(u.created_on)),
      ),
    [data.usage, deptFilter, itemFilter, monthOnly],
  );

  const clearFilters = () => {
    setDeptFilter('');
    setItemFilter('');
    setMonthOnly(false);
  };

  return (
    <ConsumablesPage
      icon={ClipboardList}
      title="Consumables usage"
      subtitle="Issue stock to departments and track what has been allocated."
      loading={loading}
      actions={
        canEdit ? (
          <button type="button" onClick={editor.startAdd} className={utilityPrimaryBtn}>
            <Send className="h-4 w-4" /> Allocate
          </button>
        ) : null
      }
      stats={
        <>
          <StatCard
            icon={ClipboardList}
            label="Allocations"
            value={stats.total}
            active={!monthOnly}
            onClick={() => setMonthOnly(false)}
          />
          <StatCard
            icon={CalendarDays}
            label="This month"
            value={stats.thisMonth}
            hint={new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            tone="sky"
            active={monthOnly}
            onClick={() => setMonthOnly((v) => !v)}
          />
          <StatCard icon={Building2} label="Departments served" value={stats.departments} tone="violet" />
          <StatCard icon={Package} label="Items allocated" value={stats.items} tone="emerald" />
        </>
      }
    >
      <UsageTable
        rows={rows}
        canEdit={canEdit}
        onEdit={editor.startEdit}
        onDelete={(row) =>
          editor.confirmDelete(row, `${row.cusage_id} (${row.consumable} → ${row.dept_name || row.dept_id})`)
        }
        filtersActive={!!(deptFilter || itemFilter || monthOnly)}
        resetKey={`${deptFilter}|${itemFilter}|${monthOnly}`}
        onClearFilters={clearFilters}
        filters={
          <>
            <ToolbarSelect value={deptFilter} onChange={setDeptFilter} label="Filter by department">
              <option value="">All departments</option>
              {deptOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </ToolbarSelect>
            <ToolbarSelect value={itemFilter} onChange={setItemFilter} label="Filter by consumable">
              <option value="">All consumables</option>
              {itemOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </ToolbarSelect>
          </>
        }
        emptyAction={
          canEdit ? (
            <button type="button" onClick={editor.startAdd} className={`${utilityPrimaryBtn} mt-1`}>
              <Plus className="h-4 w-4" /> Allocate stock
            </button>
          ) : null
        }
      />

      {editor.editing ? (
        <UsageForm
          key={editor.editing.cusage_id || 'new'}
          initial={editor.editing}
          inventory={data.inventory}
          departments={data.lookups.departments}
          saving={editor.saving}
          onSubmit={editor.save}
          onCancel={editor.cancel}
        />
      ) : null}

      <ConfirmDeleteDialog
        open={!!editor.pendingDelete}
        title="Delete allocation"
        message={
          <>
            Delete <strong className="text-[#0E2F4B]">{editor.pendingDelete?.description}</strong>? The allocated
            quantity goes back to stock.
          </>
        }
        busy={editor.deleting}
        onCancel={editor.cancelDelete}
        onConfirm={editor.performDelete}
      />
    </ConsumablesPage>
  );
}
