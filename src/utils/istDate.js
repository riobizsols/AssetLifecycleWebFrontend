/** Asia/Kolkata calendar helpers for date-only fields (YYYY-MM-DD). */

const IST_TZ = 'Asia/Kolkata';

/**
 * Convert a Date/ISO/naive timestamp to IST calendar YYYY-MM-DD.
 * Prefer this over Date#toISOString().slice(0, 10) to avoid UTC day-shift.
 */
export function toIstDateInput(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleDateString('en-CA', { timeZone: IST_TZ });
  }
  const s = String(value).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  return d.toLocaleDateString('en-CA', { timeZone: IST_TZ });
}

export function todayIstDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: IST_TZ });
}
