import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronDown, Download, RefreshCw } from 'lucide-react';
import { useAuditLog } from '../../hooks/useAuditLog';
import { REPORTS_APP_IDS } from '../../constants/reportsAuditEvents';
import {
  applyAdvancedFilters,
  ReportPreviewModal,
  useReportColumns,
} from '../../components/reportModels/ReportExtras';
import { useConsolidatedAssetRegister } from './consolidatedAssetRegister/useConsolidatedAssetRegister';
import FiltersBar from './consolidatedAssetRegister/FiltersBar';
import KpiStrip from './consolidatedAssetRegister/KpiStrip';
import OverviewTab from './consolidatedAssetRegister/OverviewTab';
import AssetTypesTab from './consolidatedAssetRegister/AssetTypesTab';
import RegisterTab from './consolidatedAssetRegister/RegisterTab';
import { exportExcel, exportPdf } from './consolidatedAssetRegister/exportReport';
import { formatInrCurrency } from './consolidatedAssetRegister/utils';
import {
  CONSOLIDATED_FIELD_ACCESSORS,
  CONSOLIDATED_REGISTER_COLUMNS,
  getConsolidatedCellValue,
} from './newReportExtrasConfig';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'asset-types', label: 'Asset types' },
  { id: 'register', label: 'Asset register' },
];

function labelsForIds(ids = [], options = []) {
  if (!ids?.length) return [];
  const map = new Map(
    (options || []).map((o) => [
      String(o.id ?? o.value),
      String(o.label ?? o.name ?? o.id ?? o.value),
    ]),
  );
  return ids.map((id) => map.get(String(id)) || String(id));
}

export default function ConsolidatedAssetRegister() {
  const { recordActionByNameWithFetch } = useAuditLog(
    REPORTS_APP_IDS.CONSOLIDATED_ASSET_REPORT,
  );
  const [tab, setTab] = useState('overview');
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const [advanced, setAdvanced] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { columns, setColumns } = useReportColumns(
    CONSOLIDATED_REGISTER_COLUMNS.default,
    CONSOLIDATED_REGISTER_COLUMNS.all,
  );

  const {
    filterOptions,
    campusOptions,
    departmentOptions,
    draft,
    setDraft,
    applied,
    summary,
    register,
    loadingOptions,
    loadingSummary,
    loadingRegister,
    hasInstitution,
    page,
    setPage,
    pageSize,
    setPageSize,
    registerDraft,
    setRegisterDraft,
    registerApplied,
    applyFilters,
    resetFilters,
    applyRegisterFilters,
    resetRegisterFilters,
    refresh,
    registerQueryFilters,
  } = useConsolidatedAssetRegister();

  const filteredRegisterRows = useMemo(
    () =>
      applyAdvancedFilters(
        register?.rows || [],
        advanced,
        CONSOLIDATED_FIELD_ACCESSORS,
      ),
    [register?.rows, advanced],
  );

  const filteredRegister = useMemo(
    () => ({
      ...register,
      rows: filteredRegisterRows,
    }),
    [register, filteredRegisterRows],
  );

  const filterSummary = useMemo(() => {
    const items = [];
    if (summary?.asOfLabel) items.push({ label: 'As of', value: summary.asOfLabel });

    const orgLabels = labelsForIds(applied.orgIds, filterOptions.institutions);
    items.push({
      label: 'Institution',
      value: orgLabels.length ? orgLabels.join(', ') : '—',
    });

    const campusLabels = labelsForIds(applied.branchIds, filterOptions.campuses);
    items.push({
      label: 'Campus',
      value: campusLabels.length ? campusLabels.join(', ') : 'All campuses',
    });

    const deptLabels = labelsForIds(applied.deptIds, filterOptions.departments);
    items.push({
      label: 'Department',
      value: deptLabels.length ? deptLabels.join(', ') : 'All departments',
    });

    const typeLabels = labelsForIds(registerApplied?.assetTypeIds, filterOptions.assetTypes);
    if (typeLabels.length) items.push({ label: 'Asset type', value: typeLabels.join(', ') });

    const statusLabels = labelsForIds(registerApplied?.statuses, filterOptions.statuses);
    if (statusLabels.length) items.push({ label: 'Status', value: statusLabels.join(', ') });

    if (registerApplied?.search?.trim()) {
      items.push({ label: 'Search', value: registerApplied.search.trim() });
    }

    if (advanced?.length) {
      items.push({
        label: 'Advanced',
        value: `${advanced.length} condition${advanced.length === 1 ? '' : 's'}`,
      });
    }

    return items;
  }, [
    summary,
    applied,
    registerApplied,
    filterOptions,
    advanced,
  ]);

  const previewSummaryItems = useMemo(() => {
    const c = summary?.consolidated || {};
    return [
      { label: 'Asset count', value: String(c.asset_count ?? 0) },
      { label: 'Acquisition value', value: formatInrCurrency(c.acquisition_value) },
      { label: 'Depreciation', value: formatInrCurrency(c.total_depreciation) },
      { label: 'Book value', value: formatInrCurrency(c.book_value) },
      { label: 'Institutions', value: String(summary?.institutions?.length ?? 0) },
      { label: 'Preview rows', value: String(filteredRegisterRows.length) },
    ];
  }, [summary, filteredRegisterRows.length]);

  const handleReset = () => {
    resetFilters();
    setAdvanced([]);
  };

  useEffect(() => {
    if (!exportMenuOpen) return undefined;
    const onDocClick = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [exportMenuOpen]);

  const handleExport = useCallback(async (format) => {
    try {
      setExportMenuOpen(false);
      setExporting(true);
      const payload = { summary, queryFilters: registerQueryFilters, filterSummary };
      if (format === 'pdf') {
        await exportPdf(payload);
      } else {
        await exportExcel(payload);
      }
      await recordActionByNameWithFetch('Export Report', {
        format: format === 'pdf' ? 'pdf' : 'xlsx',
        reportType: 'Consolidated Asset Register',
      });
      toast.success(format === 'pdf' ? 'PDF exported' : 'Excel exported');
    } catch (err) {
      toast.error(err?.message || (format === 'pdf' ? 'PDF export failed' : 'Excel export failed'));
    } finally {
      setExporting(false);
    }
  }, [summary, registerQueryFilters, filterSummary, recordActionByNameWithFetch]);

  return (
    <div className="min-h-full bg-slate-50/80">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            As of {summary?.asOfLabel || '—'}
            {loadingSummary ? ' · Loading…' : ''}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setExportMenuOpen((v) => !v)}
                disabled={exporting || loadingSummary}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? 'Exporting…' : 'Export'}
                <ChevronDown className={`h-3 w-3 text-slate-400 transition ${exportMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportMenuOpen && !exporting && (
                <div className="absolute right-0 z-30 mt-1.5 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => handleExport('xlsx')}
                    className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('pdf')}
                    className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    PDF (.pdf)
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>

        <FiltersBar
          draft={draft}
          setDraft={setDraft}
          institutions={filterOptions.institutions}
          campuses={campusOptions}
          departments={departmentOptions}
          assetTypes={filterOptions.assetTypes}
          statuses={filterOptions.statuses}
          loading={loadingOptions}
          onApply={applyFilters}
          onReset={handleReset}
          advanced={advanced}
          setAdvanced={setAdvanced}
          onPreview={() => {
            if (!hasInstitution) {
              toast.error('Select an institution and Apply first');
              return;
            }
            setTab('register');
            setPreviewOpen(true);
          }}
          previewDisabled={!hasInstitution || loadingRegister}
        />

        {!hasInstitution ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
            Select an institution and click Apply to load the report.
          </div>
        ) : (
          <>
            <KpiStrip consolidated={summary?.consolidated} loading={loadingSummary} />

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-100 px-2">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      tab === t.id
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="p-5">
                {tab === 'overview' && (
                  <OverviewTab summary={summary} loading={loadingSummary} />
                )}
                {tab === 'asset-types' && (
                  <AssetTypesTab summary={summary} loading={loadingSummary} />
                )}
                {tab === 'register' && (
                  <RegisterTab
                    register={filteredRegister}
                    loading={loadingRegister}
                    page={page}
                    setPage={setPage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    registerDraft={registerDraft}
                    setRegisterDraft={setRegisterDraft}
                    assetTypes={filterOptions.assetTypes}
                    statuses={filterOptions.statuses}
                    onApplyRegisterFilters={applyRegisterFilters}
                    onResetRegisterFilters={resetRegisterFilters}
                    columns={columns}
                    setColumns={setColumns}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <ReportPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Asset register preview"
        columns={columns}
        rows={filteredRegisterRows}
        getCellValue={getConsolidatedCellValue}
        filterSummary={filterSummary}
        summaryItems={previewSummaryItems}
        emptyLabel="No assets to preview — Apply filters and open the Asset register tab."
      />
    </div>
  );
}
