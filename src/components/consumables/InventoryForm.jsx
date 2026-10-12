import React, { useMemo, useState } from 'react';
import { UtilityField, utilityInputClass } from '../../pages/utility/UtilityUi';
import { formatQty } from '../../hooks/useConsumablesData';
import { FieldHint, FormDrawer } from './ConsumablesUi';
import StockStatusBadge from './StockStatusBadge';
import { computeStockStatus } from './stockStatus';

const empty = {
  consum_id: '',
  brand: '',
  quantity: '',
  min_stock: '',
  reorder_level: '',
  reference: '',
  remarks: '',
};

const normBrand = (value) => String(value || '').trim().toLowerCase();

const numberInput = (value, onChange, props = {}) => (
  <input
    type="number"
    min="0"
    step="any"
    value={value}
    onChange={onChange}
    className={utilityInputClass}
    {...props}
  />
);

export default function InventoryForm({ initial, consumables, inventory = [], saving, onSubmit, onCancel }) {
  const isEdit = !!initial?.cinven_id;
  const [form, setForm] = useState(() => ({
    ...empty,
    ...(initial || {}),
    brand: initial?.brand || '',
    reference: '',
    remarks: '',
  }));
  // Thresholds the user typed themselves are kept; otherwise they follow the matched row.
  const [thresholdsTouched, setThresholdsTouched] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setThreshold = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({
      ...prev,
      ...(existing && !thresholdsTouched
        ? { min_stock: existing.min_stock ?? '', reorder_level: existing.reorder_level ?? '' }
        : {}),
      [field]: value,
    }));
    setThresholdsTouched(true);
  };

  const uom = useMemo(
    () => consumables.find((c) => c.consum_id === form.consum_id)?.uom_name || '',
    [consumables, form.consum_id],
  );

  const brandsForConsumable = useMemo(
    () => inventory.filter((i) => i.consum_id === form.consum_id),
    [inventory, form.consum_id],
  );

  const brandNames = useMemo(
    () => [...new Set(brandsForConsumable.map((i) => i.brand?.trim() || 'Unbranded'))],
    [brandsForConsumable],
  );

  /** Existing row for the same consumable + brand: saving tops it up instead of adding a row. */
  const existing = useMemo(() => {
    if (isEdit || !form.consum_id) return null;
    return brandsForConsumable.find((i) => normBrand(i.brand) === normBrand(form.brand)) || null;
  }, [isEdit, form.consum_id, form.brand, brandsForConsumable]);

  const minStock = existing && !thresholdsTouched ? existing.min_stock : form.min_stock;
  const reorderLevel = existing && !thresholdsTouched ? existing.reorder_level : form.reorder_level;

  const quantityChanged =
    isEdit && form.quantity !== '' && Number(form.quantity) !== Number(initial.quantity);

  const adding = form.quantity === '' ? null : Number(form.quantity);
  const newTotal = existing && adding !== null ? Number(existing.quantity) + adding : adding;
  const previewStatus =
    newTotal === null
      ? null
      : computeStockStatus({ quantity: newTotal, min_stock: minStock, reorder_level: reorderLevel });

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      consum_id: form.consum_id,
      brand: form.brand.trim(),
      quantity: form.quantity,
      min_stock: minStock,
      reorder_level: reorderLevel,
      reference: form.reference.trim(),
      remarks: form.remarks.trim(),
    });
  };

  const unit = uom ? ` ${uom}` : '';
  const title = isEdit ? `Edit ${initial.consumable || 'stock'}` : existing ? 'Restock' : 'Add stock';

  return (
    <FormDrawer
      title={title}
      description={
        existing
          ? 'This brand already has stock — the quantity is added to the existing entry.'
          : 'A dashboard alert is raised when quantity drops to the min stock or reorder level.'
      }
      onClose={onCancel}
      onSubmit={submit}
      saving={saving}
      submitLabel={isEdit ? 'Save changes' : existing ? 'Restock' : 'Add stock'}
    >
      <UtilityField label="Consumable" required>
        <select
          value={form.consum_id}
          onChange={set('consum_id')}
          className={`${utilityInputClass} disabled:bg-[#F3F6F9]`}
          disabled={isEdit}
          required
        >
          <option value="">Select consumable</option>
          {consumables.map((c) => (
            <option key={c.consum_id} value={c.consum_id}>
              {c.consumable}
            </option>
          ))}
        </select>
        {uom ? <FieldHint>Unit of measure: {uom}</FieldHint> : null}
        {isEdit ? <FieldHint>The consumable can't be changed on an existing stock entry.</FieldHint> : null}
      </UtilityField>

      <UtilityField label="Brand">
        <input
          value={form.brand}
          onChange={set('brand')}
          placeholder="e.g. Nayara"
          className={utilityInputClass}
          list={!isEdit && brandsForConsumable.length ? 'consumable-brands' : undefined}
          autoComplete="off"
        />
        {!isEdit && brandsForConsumable.length ? (
          <>
            <datalist id="consumable-brands">
              {brandNames
                .filter((b) => b !== 'Unbranded')
                .map((b) => (
                  <option key={b} value={b} />
                ))}
            </datalist>
            <FieldHint>Existing brands: {brandNames.join(', ')}. Use the same name to restock.</FieldHint>
          </>
        ) : null}
      </UtilityField>

      <UtilityField
        label={`${existing ? 'Quantity to add' : 'Quantity on hand'}${uom ? ` (${uom})` : ''}`}
        required
      >
        {numberInput(form.quantity, set('quantity'), { required: true })}
      </UtilityField>

      {existing ? (
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-[#E8EEF4] bg-[#F8FAFC] p-3 text-center">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#5A6B7C]">Current</div>
            <div className="font-semibold tabular-nums text-[#0E2F4B]">
              {formatQty(existing.quantity)}
              {unit}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#5A6B7C]">Adding</div>
            <div className="font-semibold tabular-nums text-[#0E2F4B]">+ {formatQty(adding ?? 0)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#5A6B7C]">New total</div>
            <div className="font-semibold tabular-nums text-emerald-700">
              {formatQty(newTotal ?? existing.quantity)}
              {unit}
            </div>
          </div>
        </div>
      ) : null}

      {!isEdit ? (
        <UtilityField label="Reference">
          <input
            value={form.reference}
            onChange={set('reference')}
            placeholder="Invoice / bill / PO number"
            className={utilityInputClass}
            maxLength={100}
          />
        </UtilityField>
      ) : null}
      {!isEdit || quantityChanged ? (
        <UtilityField label={isEdit ? 'Reason for quantity change' : 'Remarks'}>
          <input
            value={form.remarks}
            onChange={set('remarks')}
            placeholder={isEdit ? 'e.g. Physical count correction, damaged items' : 'e.g. Supplier name, notes'}
            className={utilityInputClass}
            maxLength={255}
          />
          <FieldHint>Saved in the stock history.</FieldHint>
        </UtilityField>
      ) : null}

      <div className="rounded-lg border border-[#E8EEF4] bg-[#F8FAFC] p-3">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#5A6B7C]">Alert thresholds</p>
        <div className="grid grid-cols-2 gap-3">
          <UtilityField label="Min stock">{numberInput(minStock ?? '', setThreshold('min_stock'))}</UtilityField>
          <UtilityField label="Reorder level">
            {numberInput(reorderLevel ?? '', setThreshold('reorder_level'))}
          </UtilityField>
        </div>
        <FieldHint>
          {existing
            ? 'Kept from the existing entry — change them only if needed.'
            : 'Reorder level is checked first, then min stock.'}
        </FieldHint>
      </div>

      {previewStatus ? (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-[#C9D5E3] px-3 py-2.5">
          <span className="text-xs text-[#5A6B7C]">Status after saving</span>
          <StockStatusBadge status={previewStatus} />
        </div>
      ) : null}
    </FormDrawer>
  );
}
