import React from 'react';
import { Boxes } from 'lucide-react';
import ConsumablesDataTable from './ConsumablesDataTable';
import StockStatusBadge from './StockStatusBadge';
import { LevelBar } from './ConsumablesUi';
import { STOCK_STATUS } from './stockStatus';
import { formatQty } from '../../hooks/useConsumablesData';

const STATUS_ORDER = { OUT_OF_STOCK: 0, REORDER: 1, LOW_STOCK: 2, OK: 3 };

/** Bar scale: twice the higher threshold, so "at threshold" sits around the middle. */
const barMax = (r) => {
  const threshold = Math.max(Number(r.min_stock) || 0, Number(r.reorder_level) || 0);
  return threshold > 0 ? threshold * 2 : Math.max(Number(r.quantity) || 0, 1);
};

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
          {r.cinven_id}
          {r.brand ? <> · {r.brand}</> : null}
        </div>
      </div>
    ),
  },
  { key: 'branch_name', label: 'Branch', maxWidth: 200 },
  {
    key: 'quantity',
    label: 'On hand',
    align: 'right',
    sortValue: (r) => Number(r.quantity),
    render: (r) => {
      const tone = (STOCK_STATUS[r.stock_status] || STOCK_STATUS.OK).tone;
      return (
        <div className="ml-auto w-32">
          <div className="font-semibold">
            {formatQty(r.quantity)}
            {r.uom_name ? <span className="ml-1 text-xs font-normal text-[#7A8A9A]">{r.uom_name}</span> : null}
          </div>
          <div className="mt-1">
            <LevelBar value={Number(r.quantity) || 0} max={barMax(r)} tone={tone} />
          </div>
        </div>
      );
    },
  },
  {
    key: 'min_stock',
    label: 'Min stock',
    align: 'right',
    sortValue: (r) => Number(r.min_stock),
    render: (r) => <span className="text-[#33506B]">{formatQty(r.min_stock)}</span>,
  },
  {
    key: 'reorder_level',
    label: 'Reorder at',
    align: 'right',
    sortValue: (r) => Number(r.reorder_level),
    render: (r) => <span className="text-[#33506B]">{formatQty(r.reorder_level)}</span>,
  },
  {
    key: 'last_restocked_on',
    label: 'Last restocked',
    sortValue: (r) => (r.last_restocked_on ? new Date(r.last_restocked_on).getTime() : null),
    render: (r) =>
      r.last_restocked_on ? (
        <div className="whitespace-nowrap">
          <div className="text-[#33506B]">
            {new Date(r.last_restocked_on).toLocaleDateString(undefined, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
          <div className="text-[11px] text-emerald-700">+{formatQty(r.last_restocked_qty)}</div>
        </div>
      ) : (
        <span className="text-[#A0AEBB]">—</span>
      ),
  },
  {
    key: 'stock_status',
    label: 'Status',
    sortValue: (r) => STATUS_ORDER[r.stock_status] ?? 9,
    render: (r) => <StockStatusBadge status={r.stock_status} />,
  },
];

export default function InventoryTable({ rows, canEdit, onEdit, onDelete, ...tableProps }) {
  return (
    <ConsumablesDataTable
      title="Stock on hand"
      columns={columns}
      rows={rows}
      rowKey="cinven_id"
      searchKeys={['cinven_id', 'brand', 'uom_name']}
      canEdit={canEdit}
      onEdit={onEdit}
      onDelete={onDelete}
      emptyIcon={Boxes}
      emptyText="No stock recorded yet."
      defaultSort={{ key: 'stock_status', dir: 'asc' }}
      {...tableProps}
    />
  );
}
