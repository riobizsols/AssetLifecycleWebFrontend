import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Save } from 'lucide-react';
import { utilityService } from '../../services/utilityService';
import {
  UtilityField,
  UtilityPageShell,
  UtilityPanel,
  utilityInputClass,
  utilityPrimaryBtn,
} from './UtilityUi';

const today = () => new Date().toISOString().slice(0, 10);

export default function UtilityConsumption() {
  const [details, setDetails] = useState([]);
  const [rows, setRows] = useState([]);
  const [utildId, setUtildId] = useState('');
  const [reading, setReading] = useState('');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(today());
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => details.find((d) => d.utild_id === utildId) || null,
    [details, utildId],
  );
  const isMeter = selected?.utctp_id === 'UTCTP001';

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [d, c] = await Promise.all([
        utilityService.listDetails(),
        utilityService.listConsumptions({ limit: 50 }),
      ]);
      setDetails(d);
      setRows(c);
      setUtildId((prev) => prev || d[0]?.utild_id || '');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load consumption data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPreview(null);
    setReading('');
    setQuantity('');
  }, [utildId]);

  useEffect(() => {
    if (!isMeter || reading === '' || !utildId) {
      setPreview(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const p = await utilityService.previewConsumption({
          utild_id: utildId,
          reading: Number(reading),
          consumption_date: date,
        });
        setPreview(p);
      } catch {
        setPreview(null);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [isMeter, reading, utildId, date]);

  const submit = async () => {
    if (!utildId) return toast.error('Utility detail is required');
    if (!date) return toast.error('Consumption date is required');
    setSaving(true);
    try {
      const payload = {
        utild_id: utildId,
        consumption_date: date,
      };
      if (isMeter) {
        if (reading === '') throw new Error('Meter reading is required');
        payload.reading = Number(reading);
      } else {
        if (quantity === '') throw new Error('Quantity consumed is required');
        payload.quantity_consumed = Number(quantity);
      }
      const row = await utilityService.createConsumption(payload);
      toast.success(
        row.rolled_over
          ? `Saved with meter rollover · consumed ${row.quantity_consumed}`
          : `Saved · consumed ${row.quantity_consumed ?? '—'}`,
      );
      setReading('');
      setQuantity('');
      setPreview(null);
      await load({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <UtilityPageShell loading={loading}>
      <div className="space-y-5">
        <UtilityPanel title="New consumption entry">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UtilityField label="Utility detail" required>
              <select
                className={utilityInputClass}
                value={utildId}
                onChange={(e) => setUtildId(e.target.value)}
                required
              >
                <option value="">Select utility detail</option>
                {details.map((d) => (
                  <option key={d.utild_id} value={d.utild_id}>
                    {d.utility_name} / {d.utility_sh} · {d.consumption_type}
                    {d.meter_max ? ` · max ${d.meter_max}` : ''}
                  </option>
                ))}
              </select>
            </UtilityField>
            <UtilityField label="Consumption date" required>
              <input
                type="date"
                className={utilityInputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </UtilityField>
            {isMeter ? (
              <UtilityField label="Meter reading" required>
                <input
                  type="number"
                  min={0}
                  className={utilityInputClass}
                  value={reading}
                  onChange={(e) => setReading(e.target.value)}
                  placeholder="e.g. 250"
                  required
                />
              </UtilityField>
            ) : (
              <UtilityField label="Quantity consumed" required>
                <input
                  type="number"
                  min={0}
                  className={utilityInputClass}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 100"
                  required
                />
              </UtilityField>
            )}
          </div>

          {isMeter && preview && (
            <div className="mt-4 rounded-md border border-[#D7E0EA] bg-[#F3F6F9] px-4 py-3 text-sm text-[#0E2F4B]">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <div>
                  Previous reading:{' '}
                  <strong>{preview.previousReading?.reading ?? 'none (baseline)'}</strong>
                </div>
                <div>
                  Quantity consumed:{' '}
                  <strong>
                    {preview.preview?.quantity_consumed == null
                      ? '— (first / baseline reading)'
                      : preview.preview.quantity_consumed}
                  </strong>
                  {preview.preview?.rolled_over ? (
                    <span className="ml-2 font-semibold text-[#B54708]">
                      rollover at {selected?.meter_max}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-1 text-xs text-[#5A6B7C]">
                If current &lt; previous: (meter_max − previous) + current
              </p>
            </div>
          )}

          <div className="mt-4">
            <button
              type="button"
              onClick={submit}
              disabled={saving || !details.length}
              className={utilityPrimaryBtn}
            >
              <Save className="h-4 w-4" /> Save record
            </button>
          </div>
        </UtilityPanel>

        <UtilityPanel title="Recent records" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[#0E2F4B] text-left text-[11px] uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">Utility</th>
                  <th className="px-4 py-2.5 font-semibold">Reading</th>
                  <th className="px-4 py-2.5 font-semibold">Qty consumed</th>
                  <th className="px-4 py-2.5 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EEF4]">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-[#5A6B7C]">
                      No consumption recorded yet
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.utcv_id} className="bg-white hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 text-[#334155]">
                      {r.consumption_date ? String(r.consumption_date).slice(0, 10) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#0E2F4B]">
                        {r.utility_name} / {r.utility_sh}
                      </div>
                      <div className="text-xs capitalize text-[#5A6B7C]">
                        {r.consumption_type}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#334155]">{r.reading ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-[#0E2F4B]">
                      {r.quantity_consumed ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.rolled_over ? (
                        <span className="rounded bg-[#FFFAEB] px-2 py-0.5 text-xs font-semibold text-[#B54708]">
                          Rollover
                        </span>
                      ) : (
                        <span className="text-[#5A6B7C]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </UtilityPanel>
      </div>
    </UtilityPageShell>
  );
}
