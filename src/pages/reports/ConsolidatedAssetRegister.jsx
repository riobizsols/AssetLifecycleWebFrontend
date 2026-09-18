import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useAuditLog } from '../../hooks/useAuditLog';
import { REPORTS_APP_IDS } from '../../constants/reportsAuditEvents';
import { useConsolidatedAssetRegister } from './consolidatedAssetRegister/useConsolidatedAssetRegister';
import FiltersBar from './consolidatedAssetRegister/FiltersBar';
import KpiStrip from './consolidatedAssetRegister/KpiStrip';
import OverviewTab from './consolidatedAssetRegister/OverviewTab';
import CategoriesTab from './consolidatedAssetRegister/CategoriesTab';
import RegisterTab from './consolidatedAssetRegister/RegisterTab';
import { exportExcel, exportPdf } from './consolidatedAssetRegister/exportReport';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'categories', label: 'Categories' },
  { id: 'register', label: 'Asset register' },
];

export default function ConsolidatedAssetRegister() {
  const { recordActionByNameWithFetch } = useAuditLog(
    REPORTS_APP_IDS.CONSOLIDATED_ASSET_REPORT,
  );
  const [tab, setTab] = useState('overview');
  const [exporting, setExporting] = useState(false);

  const {
    filterOptions,
    campusOptions,
    departmentOptions,
    draft,
    setDraft,
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
    applyFilters,
    resetFilters,
    applyRegisterFilters,
    resetRegisterFilters,
    refresh,
    registerQueryFilters,
  } = useConsolidatedAssetRegister();

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await exportExcel({ summary, queryFilters: registerQueryFilters });
      await recordActionByNameWithFetch('Export Report', {
        format: 'xlsx',
        reportType: 'Consolidated Asset Register',
      });
      toast.success('Excel exported');
    } catch (err) {
      toast.error(err?.message || 'Excel export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExporting(true);
      await exportPdf({ summary, queryFilters: registerQueryFilters });
      await recordActionByNameWithFetch('Export Report', {
        format: 'pdf',
        reportType: 'Consolidated Asset Register',
      });
      toast.success('PDF exported');
    } catch (err) {
      toast.error(err?.message || 'PDF export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50/80">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            As of {summary?.asOfLabel || '—'}
            {loadingSummary ? ' · Loading…' : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              type="button"
              disabled={exporting || loadingSummary}
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button
              type="button"
              disabled={exporting || loadingSummary}
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> PDF
            </button>
          </div>
        </div>

        <FiltersBar
          draft={draft}
          setDraft={setDraft}
          institutions={filterOptions.institutions}
          campuses={campusOptions}
          departments={departmentOptions}
          loading={loadingOptions}
          onApply={applyFilters}
          onReset={resetFilters}
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
                {tab === 'categories' && (
                  <CategoriesTab summary={summary} loading={loadingSummary} />
                )}
                {tab === 'register' && (
                  <RegisterTab
                    register={register}
                    loading={loadingRegister}
                    page={page}
                    setPage={setPage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    registerDraft={registerDraft}
                    setRegisterDraft={setRegisterDraft}
                    categories={filterOptions.categories}
                    statuses={filterOptions.statuses}
                    onApplyRegisterFilters={applyRegisterFilters}
                    onResetRegisterFilters={resetRegisterFilters}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
