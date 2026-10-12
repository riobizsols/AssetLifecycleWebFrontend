import React from 'react';
import { STOCK_STATUS } from './stockStatus';

export default function StockStatusBadge({ status }) {
  const meta = STOCK_STATUS[status] || STOCK_STATUS.OK;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
