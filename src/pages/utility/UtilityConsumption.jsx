import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Save } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const queryUtilId = searchParams.get('utilId') || '';
  const queryUtildId = searchParams.get('utildId') || '';
  const queryAssetId = searchParams.get('assetId') || '';
  const queryDate = searchParams.get('date') || '';

  const [details, setDetails] = useState([]);
  const [rows, setRows] = useState([]);
  const [utilId, setUtilId] = useState(queryUtilId);
  const [utildId, setUtildId] = useState(queryUtildId);
  const [assetId, setAssetId] = useState(queryAssetId);
  const [reading, setReading] = useState('');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(queryDate || today());
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const utilities = useMemo(() => {
    const map = new Map();
    for (const d of details) {
      if (!d.util_id) continue;
      if (!map.has(d.util_id)) {
        map.set(d.util_id, {
          util_id: d.util_id,
          utility_name: d.utility_name || d.util_id,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.utility_name).localeCompare(String(b.utility_name)),
    );
  }, [details]);

  const profilesForUtility = useMemo(
    () => details.filter((d) => d.util_id === utilId),
    [details, utilId],
  );

  const selected = useMemo(
    () => details.find((d) => d.utild_id === utildId) || null,
    [details, utildId],
  );
  const isMeter = selected?.utctp_id === 'UTCTP001';

  const resolveSelection = useCallback(
    (list, preferredUtilId, preferredUtildId) => {
      const byUtild = preferredUtildId
        ? list.find((d) => d.utild_id === preferredUtildId)
        : null;
      if (byUtild) {
        return { utilId: byUtild.util_id, utildId: byUtild.utild_id };
      }
      const utilMatch = preferredUtilId
        ? list.filter((d) => d.util_id === preferredUtilId)
        : [];
      if (utilMatch.length) {
        return { utilId: preferredUtilId, utildId: utilMatch[0].utild_id };
      }
      if (!list.length) return { utilId: '', utildId: '' };
      return { utilId: list[0].util_id, utildId: list[0].utild_id };
    },
    [],
  );

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [d, c] = await Promise.all([
        utilityService.listDetails(),
        utilityService.listConsumptions({ limit: 50 }),
      ]);
      setDetails(d);
      setRows(c);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load consumption data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Apply URL / default selection once details are available
  useEffect(() => {
    if (!details.length) return;
    const next = resolveSelection(
      details,
      queryUtilId || utilId,
      queryUtildId || utildId,
    );
    if (next.utilId !== utilId) setUtilId(next.utilId);
    if (next.utildId !== utildId) setUtildId(next.utildId);
    if (queryAssetId && queryAssetId !== assetId) setAssetId(queryAssetId);
    if (queryDate && queryDate !== date) setDate(queryDate);
    // Only re-run when details or query params change — not on every utilId edit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details, queryUtilId, queryUtildId, queryAssetId, queryDate, resolveSelection]);

  const onUtilityChange = (nextUtilId) => {
    setUtilId(nextUtilId);
    const profiles = details.filter((d) => d.util_id === nextUtilId);
    setUtildId(profiles[0]?.utild_id || '');
  };

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
          asset_id: assetId || undefined,
        });
        setPreview(p);
      } catch {
        setPreview(null);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [isMeter, reading, utildId, date, assetId]);

  const submit = async () => {
    if (!utilId) return toast.error('Utility is required');
    if (!utildId) return toast.error('Consumption metric is required');
    if (!date) return toast.error('Consumption date is required');
    setSaving(true);
    try {
      const payload = {
        utild_id: utildId,
        consumption_date: date,
      };
      if (assetId) payload.asset_id = assetId;
      if (isMeter) {
        if (reading === '') throw new Error('Meter reading is required');
        payload.reading = Number(reading);
      } else {
        if (quantity === '') throw new Error('Quantity consumed is required');
        payload.quantity_consumed = Number(quantity);
      }
      const row = await utilityService.createConsumption(payload);
      toast.success(`Saved · consumed ${row.quantity_consumed ?? '—'}`);
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
          {assetId ? (
            <p className="mb-3 text-xs text-[#5A6B7C]">
              Recording for asset <span className="font-semibold text-[#0E2F4B]">{assetId}</span>
            </p>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UtilityField label="Utility" required>
              <select
                className={utilityInputClass}
                value={utilId}
                onChange={(e) => onUtilityChange(e.target.value)}
                required
              >
                <option value="">Select utility</option>
                {utilities.map((u) => (
                  <option key={u.util_id} value={u.util_id}>
                    {u.utility_name}
                  </option>
                ))}
              </select>
            </UtilityField>
            <UtilityField label="Choose consumption metric" required>
              <select
                className={utilityInputClass}
                value={utildId}
                onChange={(e) => setUtildId(e.target.value)}
                required
                disabled={!utilId}
              >
                <option value="">
                  {utilId ? 'Choose consumption metric' : 'Select utility first'}
                </option>
                {profilesForUtility.map((d) => (
                  <option key={d.utild_id} value={d.utild_id}>
                    {d.utility_sh}
                    {d.consumption_type ? ` · ${d.consumption_type}` : ''}
                    {d.meter_max ? ` · Maximum Reading ${d.meter_max}` : ''}
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
                  disabled={!utildId}
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
                  disabled={!utildId}
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
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <button
              type="button"
              onClick={submit}
              disabled={saving || !details.length || !utildId}
              className={utilityPrimaryBtn}
            >
              <Save className="h-4 w-4" /> Save record
            </button>
          </div>
        </UtilityPanel>

        <UtilityPanel title="Recent records" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-[#0E2F4B] text-left text-[11px] uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">Utility</th>
                  <th className="px-4 py-2.5 font-semibold">Reading</th>
                  <th className="px-4 py-2.5 font-semibold">Qty consumed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EEF4]">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-[#5A6B7C]">
                      No consumption recorded yet
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.utcv_id} className="bg-white hover:bg-[#F8FAFC]">
                    <td className="px-4 py-2.5 text-[#334155]">
                      {r.consumption_date
                        ? String(r.consumption_date).slice(0, 10)
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[#0E2F4B]">
                      {r.utility_name} / {r.utility_sh}
                      {r.asset_id ? (
                        <span className="ml-1 text-xs font-normal text-[#5A6B7C]">
                          · {r.asset_id}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-[#334155]">{r.reading ?? '—'}</td>
                    <td className="px-4 py-2.5 text-[#334155]">
                      {r.quantity_consumed ?? '—'}
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
