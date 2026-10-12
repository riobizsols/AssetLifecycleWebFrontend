export const STOCK_STATUS = {
  OUT_OF_STOCK: {
    label: 'Out of stock',
    tone: 'rose',
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'bg-rose-500',
  },
  REORDER: {
    label: 'Reorder level reached',
    tone: 'orange',
    className: 'bg-orange-50 text-orange-700 ring-orange-200',
    dot: 'bg-orange-500',
  },
  LOW_STOCK: {
    label: 'Below min stock',
    tone: 'amber',
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
  },
  OK: {
    label: 'In stock',
    tone: 'emerald',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
};

/** Mirrors STOCK_STATUS_SQL in the backend consumables model. */
export function computeStockStatus({ quantity, min_stock, reorder_level }) {
  const q = Number(quantity) || 0;
  if (q <= 0) return 'OUT_OF_STOCK';
  if (q <= (Number(reorder_level) || 0)) return 'REORDER';
  if (q <= (Number(min_stock) || 0)) return 'LOW_STOCK';
  return 'OK';
}
