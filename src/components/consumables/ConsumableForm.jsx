import React, { useMemo, useState } from 'react';
import { UtilityField, utilityInputClass } from '../../pages/utility/UtilityUi';
import { useAcmContextStore } from '../../store/useAcmContextStore';
import { useAcmScope } from '../../hooks/useAcmScope';
import { FieldHint, FormDrawer } from './ConsumablesUi';

const empty = { consumable: '', uom_id: '', branch_id: '' };

export default function ConsumableForm({ initial, lookups, saving, onSubmit, onCancel }) {
  const isEdit = !!initial?.consum_id;
  // Only set when the header ACM selection is at branch or department level.
  const acmBranchId = useAcmContextStore((s) => s.appliedBranchId);
  const { allBranches, branchIds, loading: scopeLoading } = useAcmScope();

  const [form, setForm] = useState(() => ({
    ...empty,
    ...(initial || {}),
    branch_id: initial?.branch_id || acmBranchId || '',
  }));

  const branchLocked = !!acmBranchId;

  const branchOptions = useMemo(() => {
    if (scopeLoading || allBranches || !branchIds.length) return lookups.branches;
    const allowed = new Set(branchIds.map(String));
    return lookups.branches.filter(
      (b) => allowed.has(String(b.branch_id)) || b.branch_id === form.branch_id,
    );
  }, [lookups.branches, allBranches, branchIds, scopeLoading, form.branch_id]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      consumable: form.consumable.trim(),
      uom_id: form.uom_id,
      branch_id: form.branch_id,
    });
  };

  return (
    <FormDrawer
      title={isEdit ? `Edit ${initial.consumable}` : 'Add consumable'}
      description="Item name, unit of measure and the branch it belongs to."
      onClose={onCancel}
      onSubmit={submit}
      saving={saving}
      submitLabel={isEdit ? 'Save changes' : 'Add consumable'}
    >
      <UtilityField label="Consumable" required>
        <input
          value={form.consumable}
          onChange={set('consumable')}
          placeholder="e.g. Tissue Paper"
          className={utilityInputClass}
          autoFocus
          required
        />
      </UtilityField>
      <UtilityField label="Unit of measure" required>
        <select value={form.uom_id} onChange={set('uom_id')} className={utilityInputClass} required>
          <option value="">Select UOM</option>
          {lookups.uoms.map((u) => (
            <option key={u.uom_id} value={u.uom_id}>
              {u.uom}
            </option>
          ))}
        </select>
        <FieldHint>Stock and allocations for this item are counted in this unit.</FieldHint>
      </UtilityField>
      <UtilityField label="Branch" required>
        <select
          value={form.branch_id || ''}
          onChange={set('branch_id')}
          className={`${utilityInputClass} disabled:bg-[#F3F6F9] disabled:text-[#33506B]`}
          disabled={branchLocked}
          required
        >
          <option value="">Select branch</option>
          {branchOptions.map((b) => (
            <option key={b.branch_id} value={b.branch_id}>
              {b.branch_name}
            </option>
          ))}
        </select>
        <FieldHint>
          {branchLocked
            ? 'Set from the branch selected in the header. Switch to organization level there to pick another branch.'
            : 'Choose the branch this consumable belongs to.'}
        </FieldHint>
      </UtilityField>
    </FormDrawer>
  );
}
