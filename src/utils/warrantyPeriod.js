/** Calendar date YYYY-MM-DD, purchaseDate plus whole months or years. */
export function warrantyEndDate(purchaseDate, amount, unit) {
  if (!purchaseDate || amount == null || String(amount).trim() === '') return null;
  const count = Number(amount);
  if (!Number.isInteger(count) || count <= 0) return null;

  const match = String(purchaseDate).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  let year = Number(match[1]);
  let month = Number(match[2]);
  const day = Number(match[3]);

  if (unit === 'years') {
    year += count;
  } else {
    const zeroBased = month - 1 + count;
    year += Math.floor(zeroBased / 12);
    month = (zeroBased % 12) + 1;
  }

  const lastDay = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

export function formatWarrantyEnd(isoDate) {
  if (!isoDate) return '';
  const match = String(isoDate).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString();
}
