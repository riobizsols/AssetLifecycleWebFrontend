/**
 * Shared table sorting for ContentBox lists.
 * Uses numeric-aware comparison so "003 Test Company" sorts before "072 Test Company".
 */

const LEADING_NUMBER = /^(\d+)/;
const DATE_LIKE = /^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/;

function toSortTime(value) {
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value === "string" && DATE_LIKE.test(value.trim())) {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

export function compareTableValues(aValue, bValue) {
  const aEmpty = aValue == null || aValue === "";
  const bEmpty = bValue == null || bValue === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (typeof aValue === "number" && typeof bValue === "number") {
    return aValue - bValue;
  }

  const aDate = toSortTime(aValue);
  const bDate = toSortTime(bValue);
  if (aDate != null && bDate != null) return aDate - bDate;

  const aStr = String(aValue).trim();
  const bStr = String(bValue).trim();
  const aNum = aStr.match(LEADING_NUMBER);
  const bNum = bStr.match(LEADING_NUMBER);
  if (aNum && bNum) {
    const diff = Number(aNum[1]) - Number(bNum[1]);
    if (diff !== 0) return diff;
    return aStr
      .slice(aNum[1].length)
      .localeCompare(bStr.slice(bNum[1].length), undefined, {
        numeric: true,
        sensitivity: "base",
      });
  }

  return aStr.localeCompare(bStr, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortTableRows(data, sorts = []) {
  if (!Array.isArray(data) || !sorts.length) return data;

  return [...data].sort((a, b) => {
    for (const { column, direction } of sorts) {
      if (!column || column === "actions") continue;
      const aEmpty = a[column] == null || a[column] === "";
      const bEmpty = b[column] == null || b[column] === "";
      if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
      const diff = compareTableValues(a[column], b[column]);
      if (diff !== 0) return direction === "desc" ? -diff : diff;
    }
    return 0;
  });
}

export function updateSortConfig(prevConfig, column, explicitDirection) {
  const sorts = [...(prevConfig?.sorts || [])];
  const existingIndex = sorts.findIndex((s) => s.column === column);

  const withOrder = (list) =>
    list.map((s, idx) => ({ ...s, order: idx + 1 }));

  if (explicitDirection === "clear") {
    return { sorts: withOrder(sorts.filter((s) => s.column !== column)) };
  }

  if (explicitDirection === "asc" || explicitDirection === "desc") {
    if (existingIndex >= 0) {
      sorts[existingIndex] = { ...sorts[existingIndex], direction: explicitDirection };
    } else {
      sorts.push({ column, direction: explicitDirection, order: sorts.length + 1 });
    }
    return { sorts: withOrder(sorts) };
  }

  if (existingIndex < 0) {
    sorts.push({ column, direction: "asc", order: sorts.length + 1 });
    return { sorts: withOrder(sorts) };
  }

  if (sorts[existingIndex].direction === "asc") {
    sorts[existingIndex] = { ...sorts[existingIndex], direction: "desc" };
    return { sorts: withOrder(sorts) };
  }

  return { sorts: withOrder(sorts.filter((s) => s.column !== column)) };
}
