import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyAdvancedFilters, useReportColumns } from '../../../components/reportModels/ReportExtras';
import { accessorsFor, cellText, columnByLabel } from './config';

const ALL_LABELS = (dataset) => dataset.columns.map((c) => c.label);

/** Client-side view over one dataset: search, advanced filters, sort, columns, paging. */
export function useDatasetView(dataset, rows) {
  const allLabels = useMemo(() => ALL_LABELS(dataset), [dataset]);
  const { columns, setColumns: setRawColumns, defaultColumns } = useReportColumns(
    dataset.defaultColumns,
    allLabels,
  );
  const setColumns = useCallback(
    (next) => setRawColumns(allLabels.filter((l) => next.includes(l))),
    [allLabels, setRawColumns],
  );
  const [search, setSearch] = useState('');
  const [advanced, setAdvanced] = useState([]);
  const [sort, setSort] = useState(dataset.defaultSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const accessors = useMemo(() => accessorsFor(dataset), [dataset]);

  const filtered = useMemo(() => {
    let out = applyAdvancedFilters(rows || [], advanced, accessors);
    const q = search.trim().toLowerCase();
    if (q) {
      const cols = dataset.searchLabels.map((l) => columnByLabel(dataset, l)).filter(Boolean);
      out = out.filter((r) => cols.some((c) => cellText(c, r).toLowerCase().includes(q)));
    }
    const col = sort && columnByLabel(dataset, sort.label);
    if (col) {
      const dir = sort.dir === 'desc' ? -1 : 1;
      const keyOf = (r) => {
        const v = col.value(r);
        if (col.sortDate) return v ? new Date(v).getTime() : -Infinity;
        return v;
      };
      out = [...out].sort((a, b) => {
        const av = keyOf(a);
        const bv = keyOf(b);
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true }) * dir;
      });
    }
    return out;
  }, [rows, advanced, accessors, search, sort, dataset]);

  useEffect(() => {
    setPage(1);
  }, [rows, advanced, search, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  const toggleSort = (label) =>
    setSort((prev) =>
      prev?.label === label
        ? { label, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { label, dir: columnByLabel(dataset, label)?.numeric ? 'desc' : 'asc' },
    );

  return {
    dataset,
    columns,
    setColumns,
    allColumns: allLabels,
    defaultColumns,
    search,
    setSearch,
    advanced,
    setAdvanced,
    sort,
    toggleSort,
    filtered,
    pageRows,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total: rows?.length || 0,
  };
}

export default useDatasetView;
