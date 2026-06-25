/** DB NOT NULL text columns on tblVendors — use empty string, not null. */
const NOT_NULL_STRING_FIELDS = [
  'address_line1',
  'city',
  'state',
  'pincode',
  'contact_person_name',
  'contact_person_email',
  'contact_person_number',
];

/** Nullable text columns — omit as null when blank. */
const NULLABLE_STRING_FIELDS = ['address_line2', 'gst_number', 'cin_number'];

/**
 * Normalize vendor form data before create/update API calls.
 * Prevents PostgreSQL NOT NULL violations when optional UI fields are left empty.
 */
export function normalizeVendorFormPayload(formData) {
  const out = { ...formData };

  for (const field of NOT_NULL_STRING_FIELDS) {
    const value = out[field];
    out[field] =
      value == null || String(value).trim() === '' ? '' : String(value).trim();
  }

  for (const field of NULLABLE_STRING_FIELDS) {
    const value = out[field];
    out[field] =
      value == null || String(value).trim() === '' ? null : String(value).trim();
  }

  if (out.int_status !== undefined && out.int_status !== null && out.int_status !== '') {
    const parsed = parseInt(out.int_status, 10);
    if (!Number.isNaN(parsed)) {
      out.int_status = parsed;
    }
  }

  if (out.contract_start_date === '') out.contract_start_date = null;
  if (out.contract_end_date === '') out.contract_end_date = null;

  return out;
}
