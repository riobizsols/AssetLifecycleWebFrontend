import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import StockStatusBadge from '../consumables/StockStatusBadge';
import { consumableService } from '../../services/consumableService';
import { formatQty } from '../../hooks/useConsumablesData';
import { useNavigation } from '../../hooks/useNavigation';
import { useRevalidateOnFocus } from '../../hooks/useRevalidateOnFocus';

const MAX_ROWS = 6;

/** Dashboard card listing consumables at or below min stock / reorder level. */
export default function ConsumableStockAlertsPanel() {
  const navigate = useNavigate();
  const { hasAccess, navReady } = useNavigation();
  const visible =
    navReady && (hasAccess('CONSUMABLESINVENTORY') || hasAccess('CONSUMABLESMASTER'));

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await consumableService.listAlerts();
      setAlerts(Array.isArray(rows) ? rows : []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  useRevalidateOnFocus(() => {
    if (visible) load();
  });

  if (!visible) return null;

  const openInventory = () => navigate('/consumables/inventory');

  return (
    <Card className="cursor-pointer" onClick={openInventory}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          Consumables stock alerts
          {alerts.length > 0 ? (
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
              {alerts.length}
            </span>
          ) : null}
        </CardTitle>
        <AlertTriangle
          className={`h-5 w-5 ${alerts.length ? 'text-orange-500' : 'text-gray-600'}`}
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking stock levels…
          </div>
        ) : failed ? (
          <p className="py-6 text-sm text-gray-500">Could not load stock alerts.</p>
        ) : alerts.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> All consumables are above min stock and reorder level.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {alerts.slice(0, MAX_ROWS).map((row) => (
              <li key={row.cinven_id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {row.consumable}
                    {row.brand ? <span className="text-gray-500"> · {row.brand}</span> : null}
                  </p>
                  <p className="text-xs text-gray-500">
                    Qty {formatQty(row.quantity)} {row.uom_name || ''} · Min {formatQty(row.min_stock)} ·
                    Reorder {formatQty(row.reorder_level)}
                    {row.branch_name ? ` · ${row.branch_name}` : ''}
                  </p>
                </div>
                <StockStatusBadge status={row.stock_status} />
              </li>
            ))}
            {alerts.length > MAX_ROWS ? (
              <li className="pt-2.5 text-xs font-medium text-blue-700">
                +{alerts.length - MAX_ROWS} more — view inventory
              </li>
            ) : null}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
