import React, { useMemo, useState } from 'react';
import { UtilityField, utilityInputClass } from '../../pages/utility/UtilityUi';
import { formatQty } from '../../hooks/useConsumablesData';
import { FieldHint, FormDrawer, LevelBar } from './ConsumablesUi';

const empty = { consum_id: '', cinven_id: '', dept_id: '', allocated_qty: '' };

const itemLabel = (i) => i.brand || `Unbranded (${i.cinven_id})`;

export default function UsageForm({ initial, inventory, departments, saving, onSubmit, onCancel }) {
  const isEdit = !!initial?.cusage_id;
  const [form, setForm] = useState(() => {
    const base = { ...empty, ...(initial || {}) };
    if (!base.consum_id && base.cinven_id) {
      base.consum_id = inventory.find((i) => i.cinven_id === base.cinven_id)?.consum_id || '';
    }
    return base;
  });

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const consumableOptions = useMemo(() => {
    const map = new Map();
    inventory.forEach((i) => {
      if (!map.has(i.consum_id)) map.set(i.consum_id, { name: i.consumable, uom: i.uom_name });
    });
    return [...map.entries()].sort((a, b) => String(a[1].name).localeCompare(String(b[1].name)));
  }, [inventory]);

  const selectedUom = consumableOptions.find(([id]) => id === form.consum_id)?.[1].uom || '';

  const itemOptions = useMemo(
    () => inventory.filter((i) => i.consum_id === form.consum_id),
    [inventory, form.consum_id],
  );

  const pickConsumable = (e) => {
    const consumId = e.target.value;
    const entries = inventory.filter((i) => i.consum_id === consumId && Number(i.quantity) > 0);
    setForm((prev) => ({
      ...prev,
      consum_id: consumId,
      cinven_id: entries.length === 1 ? entries[0].cinven_id : '',
    }));
  };

  const selected = useMemo(
    () => inventory.find((i) => i.cinven_id === form.cinven_id),
    [inventory, form.cinven_id],
  );

  // On edit, the current allocation is already deducted from stock — add it back for the preview.
  const available = selected
    ? Number(selected.quantity) + (isEdit ? Number(initial.allocated_qty) : 0)
    : null;
  const qty = form.allocated_qty === '' ? 0 : Number(form.allocated_qty);
  const balance = available !== null ? available - qty : null;
  const overAllocated = balance !== null && balance < 0;
  const uom = selected?.uom_name ? ` ${selected.uom_name}` : '';

  const submit = (e) => {
    e.preventDefault();
    if (overAllocated) return;
    onSubmit({
      cinven_id: form.cinven_id,
      dept_id: form.dept_id,
      allocated_qty: form.allocated_qty,
    });
  };

  const fillAll = () => {
    if (available !== null) setForm((prev) => ({ ...prev, allocated_qty: String(available) }));
  };

  return (
    <FormDrawer
      title={isEdit ? `Edit ${initial.cusage_id}` : 'Allocate to department'}
      description="The allocated quantity is deducted from inventory."
      onClose={onCancel}
      onSubmit={submit}
      saving={saving}
      submitDisabled={overAllocated}
      submitLabel={isEdit ? 'Save changes' : 'Allocate'}
    >
      <UtilityField label="Consumable" required>
        <select
          value={form.consum_id}
          onChange={pickConsumable}
          className={`${utilityInputClass} disabled:bg-[#F3F6F9]`}
          disabled={isEdit}
          required
        >
          <option value="">Select consumable</option>
          {consumableOptions.map(([id, c]) => (
            <option key={id} value={id}>
              {c.name}
            </option>
          ))}
        </select>
        {selectedUom ? <FieldHint>Unit of measure: {selectedUom}</FieldHint> : null}
      </UtilityField>
      <UtilityField label="Item" required>
        <select
          value={form.cinven_id}
          onChange={set('cinven_id')}
          className={`${utilityInputClass} disabled:bg-[#F3F6F9]`}
          disabled={isEdit || !form.consum_id}
          required
        >
          <option value="">{form.consum_id ? 'Select item' : 'Select a consumable first'}</option>
          {itemOptions.map((i) => {
            const outOfStock = Number(i.quantity) <= 0;
            return (
              <option key={i.cinven_id} value={i.cinven_id} disabled={!isEdit && outOfStock}>
                {itemLabel(i)}
                {outOfStock ? ' — out of stock' : ''}
              </option>
            );
          })}
        </select>
        {!isEdit && form.consum_id && itemOptions.length > 0 && itemOptions.every((i) => Number(i.quantity) <= 0) ? (
          <FieldHint tone="error">All items for this consumable are out of stock.</FieldHint>
        ) : null}
      </UtilityField>
      <UtilityField label="Department" required>
        <select value={form.dept_id} onChange={set('dept_id')} className={utilityInputClass} required>
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d.dept_id} value={d.dept_id}>
              {d.dept_name}
            </option>
          ))}
        </select>
      </UtilityField>
      <UtilityField label={`Quantity${uom ? ` (${uom.trim()})` : ''}`} required>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="any"
            value={form.allocated_qty}
            onChange={set('allocated_qty')}
            className={`${utilityInputClass} ${overAllocated ? 'border-[#B42318] focus:border-[#B42318]' : ''}`}
            required
          />
          {available !== null && available > 0 ? (
            <button
              type="button"
              onClick={fillAll}
              className="shrink-0 rounded-md border border-[#C9D5E3] px-3 text-xs font-medium text-[#0E2F4B] hover:bg-[#F3F6F9]"
            >
              All
            </button>
          ) : null}
        </div>
        {overAllocated ? (
          <FieldHint tone="error">More than the available stock.</FieldHint>
        ) : null}
      </UtilityField>

      {available !== null ? (
        <div className="rounded-lg border border-[#E8EEF4] bg-[#F8FAFC] p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#5A6B7C]">Available</div>
              <div className="font-semibold tabular-nums text-[#0E2F4B]">
                {formatQty(available)}
                {uom}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#5A6B7C]">Allocating</div>
              <div className="font-semibold tabular-nums text-[#0E2F4B]">− {formatQty(qty)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#5A6B7C]">Balance</div>
              <div
                className={`font-semibold tabular-nums ${overAllocated ? 'text-[#B42318]' : 'text-emerald-700'}`}
              >
                {formatQty(balance)}
                {uom}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <LevelBar
              value={Math.min(qty, available)}
              max={available}
              tone={overAllocated ? 'rose' : qty >= available ? 'orange' : 'navy'}
            />
            <FieldHint>
              {available > 0
                ? `${Math.round((Math.min(qty, available) / available) * 100)}% of available stock`
                : 'No stock available on this entry'}
            </FieldHint>
          </div>
        </div>
      ) : null}
    </FormDrawer>
  );
}
