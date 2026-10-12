import React from 'react';
import { Package } from 'lucide-react';
import ConsumablesDataTable from './ConsumablesDataTable';

const initials = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const columns = [
  {
    key: 'consumable',
    label: 'Consumable',
    maxWidth: 260,
    render: (r) => (
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#E8EFF6] text-[11px] font-semibold text-[#0E2F4B]">
          {initials(r.consumable)}
        </span>
        <div className="min-w-0 truncate font-medium">{r.consumable}</div>
      </div>
    ),
  },
  {
    key: 'uom_name',
    label: 'UOM',
    render: (r) =>
      r.uom_name ? (
        <span className="rounded-md bg-[#F3F6F9] px-2 py-0.5 text-xs font-medium text-[#33506B]">
          {r.uom_name}
        </span>
      ) : (
        <span className="text-[#A0AEBB]">—</span>
      ),
  },
  { key: 'branch_name', label: 'Branch', maxWidth: 200 },
  {
    key: 'inventory_count',
    label: 'Stock entries',
    align: 'right',
    render: (r) =>
      Number(r.inventory_count) > 0 ? (
        <span className="inline-flex min-w-[2rem] justify-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
          {r.inventory_count}
        </span>
      ) : (
        <span className="text-xs text-[#A0AEBB]">No stock</span>
      ),
  },
];

export default function ConsumablesTable({ rows, canEdit, onEdit, onDelete, ...tableProps }) {
  return (
    <ConsumablesDataTable
      title="Consumables"
      columns={columns}
      rows={rows}
      rowKey="consum_id"
      searchKeys={['consum_id']}
      canEdit={canEdit}
      onEdit={onEdit}
      onDelete={onDelete}
      emptyIcon={Package}
      emptyText="No consumables yet. Add one to get started."
      defaultSort={{ key: 'consumable', dir: 'asc' }}
      {...tableProps}
    />
  );
}
