import React from 'react';
import { Building2, ClipboardList } from 'lucide-react';
import ConsumablesDataTable from './ConsumablesDataTable';
import { formatQty } from '../../hooks/useConsumablesData';

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const columns = [
  {
    key: 'consumable',
    label: 'Consumable',
    maxWidth: 240,
    title: (r) => [r.consumable, r.brand].filter(Boolean).join(' · '),
    render: (r) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{r.consumable}</div>
        <div className="text-[11px] text-[#7A8A9A]">
          {r.cusage_id} · {r.cinven_id}
          {r.brand ? <> · {r.brand}</> : null}
        </div>
      </div>
    ),
  },
  {
    key: 'dept_name',
    label: 'Department',
    maxWidth: 200,
    title: (r) => r.dept_name || r.dept_id,
    render: (r) => (
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800">
        <Building2 className="h-3 w-3 shrink-0" />
        <span className="truncate">{r.dept_name || r.dept_id}</span>
      </span>
    ),
  },
  {
    key: 'allocated_qty',
    label: 'Allocated',
    align: 'right',
    sortValue: (r) => Number(r.allocated_qty),
    render: (r) => (
      <span className="font-semibold">
        {formatQty(r.allocated_qty)}
        {r.uom_name ? <span className="ml-1 text-xs font-normal text-[#7A8A9A]">{r.uom_name}</span> : null}
      </span>
    ),
  },
  {
    key: 'balance',
    label: 'Balance after',
    align: 'right',
    sortValue: (r) => Number(r.balance),
    render: (r) => (
      <span className={Number(r.balance) <= 0 ? 'font-medium text-rose-700' : 'text-[#33506B]'}>
        {formatQty(r.balance)}
      </span>
    ),
  },
  {
    key: 'created_on',
    label: 'Date',
    sortValue: (r) => (r.created_on ? new Date(r.created_on).getTime() : null),
    render: (r) => <span className="whitespace-nowrap text-[#33506B]">{formatDate(r.created_on)}</span>,
  },
];

export default function UsageTable({ rows, canEdit, onEdit, onDelete, ...tableProps }) {
  return (
    <ConsumablesDataTable
      title="Allocations"
      description="Quantities issued to departments. Deleting an entry returns the quantity to stock."
      columns={columns}
      rows={rows}
      rowKey="cusage_id"
      searchKeys={['cusage_id', 'cinven_id', 'brand', 'branch_name']}
      canEdit={canEdit}
      onEdit={onEdit}
      onDelete={onDelete}
      emptyIcon={ClipboardList}
      emptyText="No allocations recorded yet."
      defaultSort={{ key: 'created_on', dir: 'desc' }}
      {...tableProps}
    />
  );
}
